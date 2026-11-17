import { BLOCKCHAIN_QUIZ_CATALOG } from '../constants/quizQuestions.js'
import { GameStateModel, TransactionModel, QuizQuestionModel } from '../db/models.js'

// Lưu vết thời gian thử lại khi trả lời sai (Chống Brute-force liên tục)
const failedAttemptMap = new Map<string, number>()
const COOLDOWN_MS = 3000 // 3 giây thời gian chờ sau mỗi lần trả lời sai

/**
 * Lấy danh sách câu hỏi trắc nghiệm an toàn (bảo vệ tuyệt đối ở cấp CSDL MongoDB)
 * - Ẩn hoàn toàn trường `correctIndex` bằng projection `select('-correctIndex')`
 * - Ẩn trường `explanation` đối với các câu chưa hoàn thành để tránh suy luận đáp án
 */
export async function getSafeQuizQuestions(address?: string) {
  const isLoggedIn = !!address
  let answeredIds: number[] = []

  if (address) {
    const normalizedAddr = address.toLowerCase()
    const state = await GameStateModel.findOne({ wallet_address: normalizedAddr })
    if (state && Array.isArray(state.quiz_answered)) {
      answeredIds = state.quiz_answered
    }
  }

  // 1. Truy vấn câu hỏi từ MongoDB Collection quiz_questions
  let questions = await QuizQuestionModel.find({ is_active: { $ne: 0 } })
    .sort({ id: 1 })
    .select('-correctIndex')
    .lean()

  // 2. Dự phòng (Fallback) nếu database chưa kịp seed
  if (!questions || questions.length === 0) {
    questions = BLOCKCHAIN_QUIZ_CATALOG.map((q) => {
      const { correctIndex: _, ...rest } = q
      return rest as any
    })
  }

  // 3. Xử lý che giấu thông tin nhạy cảm theo trạng thái đã làm của người chơi
  const safeQuestions = questions.map((q) => {
    const isAnswered = answeredIds.includes(q.id)
    return {
      id: q.id,
      topic: q.topic,
      question: q.question,
      options: q.options,
      rewardCoins: q.rewardCoins,
      rewardXp: q.rewardXp,
      isAnswered,
      explanation: isAnswered ? q.explanation : undefined,
    }
  })

  const totalRewards = safeQuestions.reduce((acc, q) => acc + q.rewardCoins, 0)
  const earnedRewards = safeQuestions
    .filter((q) => answeredIds.includes(q.id))
    .reduce((acc, q) => acc + q.rewardCoins, 0)

  return {
    isLoggedIn,
    totalQuestions: safeQuestions.length,
    answeredCount: answeredIds.length,
    totalRewards,
    earnedRewards,
    answeredIds,
    questions: safeQuestions,
  }
}

/**
 * Lấy chi tiết an toàn của 1 câu hỏi duy nhất (cho phép tải từng câu, không lộ toàn bộ đề)
 */
export async function getSafeQuizQuestionById(questionId: number, address?: string) {
  let answeredIds: number[] = []
  if (address) {
    const normalizedAddr = address.toLowerCase()
    const state = await GameStateModel.findOne({ wallet_address: normalizedAddr })
    if (state && Array.isArray(state.quiz_answered)) {
      answeredIds = state.quiz_answered
    }
  }

  let question: any = await QuizQuestionModel.findOne({ id: questionId, is_active: { $ne: 0 } })
    .select('-correctIndex')
    .lean()

  if (!question) {
    const fallback = BLOCKCHAIN_QUIZ_CATALOG.find((q) => q.id === questionId)
    if (!fallback) {
      const err: any = new Error(`Không tìm thấy câu hỏi ID ${questionId}`)
      err.status = 404
      throw err
    }
    const { correctIndex: _, ...rest } = fallback
    question = rest
  }

  const isAnswered = answeredIds.includes(question.id)
  return {
    id: question.id,
    topic: question.topic,
    question: question.question,
    options: question.options,
    rewardCoins: question.rewardCoins,
    rewardXp: question.rewardXp,
    isAnswered,
    explanation: isAnswered ? question.explanation : undefined,
  }
}

/**
 * Chấm điểm câu trả lời, cộng thưởng Coin & XP, ghi nhật ký giao dịch
 * - CHỐNG RÒ RỈ: Khi sai, TUYỆT ĐỐI KHÔNG trả về `correctIndex` hoặc `explanation`!
 * - CHỐNG BRUTE-FORCE: Bắt buộc Cooldown 3s sau mỗi lần chọn sai.
 */
export async function submitQuizAnswer(address: string, questionId: number, selectedIndex: number) {
  if (isNaN(questionId) || isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) {
    const err: any = new Error('Dữ liệu câu hỏi hoặc đáp án không hợp lệ (Phải từ 0 đến 3)')
    err.status = 400
    throw err
  }

  const normalizedAddr = address.toLowerCase()
  const attemptKey = `${normalizedAddr}_${questionId}`

  // 1. Kiểm tra Cooldown chống Brute-force liên tục
  const lastFailedTime = failedAttemptMap.get(attemptKey) || 0
  const timeSinceLastFailed = Date.now() - lastFailedTime
  if (timeSinceLastFailed < COOLDOWN_MS) {
    const remainingSec = Math.ceil((COOLDOWN_MS - timeSinceLastFailed) / 1000)
    const err: any = new Error(`Vui lòng suy nghĩ kỹ và chờ ${remainingSec} giây trước khi thử lại câu hỏi này!`)
    err.status = 429
    err.cooldownSeconds = remainingSec
    throw err
  }

  // 2. Tìm câu hỏi trong MongoDB kèm trường mật `correctIndex`
  let question: any = await QuizQuestionModel.findOne({ id: questionId }).select('+correctIndex')
  if (!question) {
    question = BLOCKCHAIN_QUIZ_CATALOG.find((q) => q.id === questionId)
  }

  if (!question) {
    const err: any = new Error(`Không tìm thấy câu hỏi ID ${questionId}`)
    err.status = 404
    throw err
  }

  let state = await GameStateModel.findOne({ wallet_address: normalizedAddr })
  if (!state) {
    state = await GameStateModel.create({
      wallet_address: normalizedAddr,
      coins: 100,
      energy: 100,
      level: 1,
      xp: 0,
      quiz_answered: [],
    })
  }

  const currentAnswered: number[] = Array.isArray(state.quiz_answered) ? state.quiz_answered : []

  // 3. Chống nhận thưởng đúp (Nếu câu này đã làm xong trước đó)
  if (currentAnswered.includes(questionId)) {
    const err: any = new Error(`Bạn đã hoàn thành và nhận phần thưởng của câu hỏi "${question.question}" trước đó rồi!`)
    err.status = 400
    err.isAlreadyAnswered = true
    err.explanation = question.explanation
    throw err
  }

  // 4. So khớp đáp án trên Server
  const isCorrect = selectedIndex === question.correctIndex

  if (!isCorrect) {
    // Ghi nhận thời gian sai để phạt Cooldown 3s
    failedAttemptMap.set(attemptKey, Date.now())

    // 🔒 BẢO MẬT TUYỆT ĐỐI: KHÔNG gửi `correctIndex` hoặc `explanation` khi làm sai!
    return {
      isCorrect: false,
      message: 'Rất tiếc! Câu trả lời của bạn chưa chính xác. Vui lòng suy nghĩ kỹ và thử lại sau 3 giây nhé!',
      cooldownSeconds: 3,
    }
  }

  // 5. Nếu ĐÚNG: Xóa thời gian phạt, cộng Coin và XP vào Database
  failedAttemptMap.delete(attemptKey)
  state.coins += question.rewardCoins
  state.xp = (state.xp || 0) + question.rewardXp

  // Tính toán Level Up
  const newLevel = Math.floor(state.xp / 200) + 1
  if (newLevel > (state.level || 1)) {
    state.level = newLevel
  }

  // Đánh dấu câu hỏi đã nhận thưởng
  currentAnswered.push(questionId)
  state.quiz_answered = [...currentAnswered]
  state.markModified('quiz_answered')
  state.updated_at = new Date()
  await state.save()

  // Ghi nhật ký Transaction
  await TransactionModel.create({
    wallet_address: normalizedAddr,
    type: 'quiz_reward',
    amount: `+${question.rewardCoins} Coins`,
    details: `Trả lời đúng câu trắc nghiệm Web3: ${question.question} (+${question.rewardCoins} Coins, +${question.rewardXp} XP)`,
    created_at: new Date(),
  })

  // Chỉ khi đã trả lời ĐÚNG thì mới trả về `correctIndex` và `explanation` để học kiến thức
  return {
    isCorrect: true,
    message: `🎉 Xuất sắc! Bạn đã trả lời chính xác và nhận được +${question.rewardCoins} Coins cùng +${question.rewardXp} XP!`,
    rewardCoins: question.rewardCoins,
    rewardXp: question.rewardXp,
    correctIndex: question.correctIndex,
    explanation: question.explanation,
    newCoins: state.coins,
    newXp: state.xp,
    newLevel: state.level,
    answeredIds: state.quiz_answered,
  }
}
