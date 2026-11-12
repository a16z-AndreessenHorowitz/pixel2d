import { BLOCKCHAIN_QUIZ_CATALOG } from '../constants/quizQuestions.js'
import { GameStateModel, TransactionModel } from '../db/models.js'

/**
 * Lấy danh sách câu hỏi trắc nghiệm an toàn (ẩn đáp án đúng đối với câu chưa làm)
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

  // Ẩn correctIndex đối với các câu người chơi chưa trả lời
  const safeQuestions = BLOCKCHAIN_QUIZ_CATALOG.map((q) => {
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

  const totalRewards = BLOCKCHAIN_QUIZ_CATALOG.reduce((acc, q) => acc + q.rewardCoins, 0)
  const earnedRewards = BLOCKCHAIN_QUIZ_CATALOG.filter((q) => answeredIds.includes(q.id)).reduce(
    (acc, q) => acc + q.rewardCoins,
    0,
  )

  return {
    isLoggedIn,
    totalQuestions: BLOCKCHAIN_QUIZ_CATALOG.length,
    answeredCount: answeredIds.length,
    totalRewards,
    earnedRewards,
    answeredIds,
    questions: safeQuestions,
  }
}

/**
 * Chấm điểm câu trả lời, cộng thưởng Coin & XP, ghi nhật ký giao dịch
 */
export async function submitQuizAnswer(address: string, questionId: number, selectedIndex: number) {
  if (isNaN(questionId) || isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) {
    const err: any = new Error('Dữ liệu câu hỏi hoặc đáp án không hợp lệ (Phải từ 0 đến 3)')
    err.status = 400
    throw err
  }

  const question = BLOCKCHAIN_QUIZ_CATALOG.find((q) => q.id === questionId)
  if (!question) {
    const err: any = new Error(`Không tìm thấy câu hỏi ID ${questionId}`)
    err.status = 404
    throw err
  }

  const normalizedAddr = address.toLowerCase()

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

  // 1. Chống nhận thưởng đúp (Nếu câu này đã làm xong trước đó)
  if (currentAnswered.includes(questionId)) {
    const err: any = new Error(`Bạn đã hoàn thành và nhận phần thưởng của câu hỏi "${question.question}" trước đó rồi!`)
    err.status = 400
    err.isAlreadyAnswered = true
    err.explanation = question.explanation
    throw err
  }

  // 2. So khớp đáp án
  const isCorrect = selectedIndex === question.correctIndex

  if (!isCorrect) {
    return {
      isCorrect: false,
      message: 'Rất tiếc! Câu trả lời của bạn chưa chính xác. Hãy đọc phần giải thích kiến thức bên dưới và thử lại nhé!',
      correctIndex: question.correctIndex,
      explanation: question.explanation,
    }
  }

  // 3. Đúng: Cộng Coin và XP vào Database
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
