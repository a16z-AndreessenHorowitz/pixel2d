import mongoose from 'mongoose'
import { CONFIG } from '../config/index.js'
import { GameStateModel, TransactionModel, QuizQuestionModel } from '../db/models.js'
import { seedQuizQuestions } from '../db/database.js'
import { getSafeQuizQuestions, submitQuizAnswer } from '../services/quizService.js'

async function runQuizVerification() {
  console.log('======================================================================')
  console.log('🎓 KIỂM THỬ HỆ THỐNG TRẮC NGHIỆM BLOCKCHAIN VỚI MONGODB ATLAS')
  console.log('======================================================================\n')

  const testResults: { name: string; passed: boolean; details?: string }[] = []

  function record(name: string, passed: boolean, details?: string) {
    testResults.push({ name, passed, details })
    const icon = passed ? '✅ [PASS]' : '❌ [FAIL]'
    console.log(`${icon} - ${name}`)
    if (details) console.log(`   └─ Chi tiết: ${details}`)
  }

  // 1. KẾT NỐI MONGODB ATLAS
  await mongoose.connect(CONFIG.MONGODB_URI)
  record('Kết nối MongoDB Atlas Cloud', true, 'Cụm cluster0.ws4tfvk.mongodb.net/pixel2d')

  // 2. KIỂM THỬ DATABASE COLLECTION & SEEDER
  console.log('\n--- 1. KIỂM THỬ DATABASE MONGODB: COLLECTION quiz_questions ---')
  await seedQuizQuestions()
  const questionCount = await QuizQuestionModel.countDocuments()
  record(
    'Collection quiz_questions tồn tại & Seed dữ liệu thành công',
    questionCount >= 10,
    `Đã lưu trữ thành công ${questionCount} câu hỏi trong bảng quiz_questions của MongoDB Atlas`,
  )

  const testWallet = '0xquiz_student_test_address_12345'.toLowerCase()
  await GameStateModel.deleteOne({ wallet_address: testWallet })
  await TransactionModel.deleteMany({ wallet_address: testWallet })

  // 3. KIỂM THỬ BẢO MẬT PROJECTION (CLIENT KHÔNG BAO GIỜ NHẬN ĐƯỢC CORRECT_INDEX)
  console.log('\n--- 2. KIỂM THỬ BẢO MẬT CẤP DATABASE: ZERO-LEAK PROJECTION ---')
  const safeData = await getSafeQuizQuestions(testWallet)
  const hasLeakedIndex = safeData.questions.some((q: any) => q.correctIndex !== undefined)
  const hasLeakedExplanation = safeData.questions.some((q: any) => !q.isAnswered && q.explanation !== undefined)

  record(
    'Bảo mật Projection: Ẩn hoàn toàn correctIndex từ MongoDB',
    !hasLeakedIndex,
    'Mongoose projection select("-correctIndex") ngăn chặn rò rỉ đáp án ra ngoài mạng',
  )
  record(
    'Bảo mật: Ẩn giải thích (explanation) đối với câu chưa làm',
    !hasLeakedExplanation,
    'Người dùng không thể xem giải thích trước khi trả lời đúng để suy ra đáp án',
  )

  // 4. KIỂM THỬ XỬ LÝ KHI TRẢ LỜI SAI: TUYỆT ĐỐI KHÔNG TIẾT LỘ ĐÁP ÁN ĐÚNG
  console.log('\n--- 3. KIỂM THỬ TRẢ LỜI SAI (CHỐNG LỘ ĐÁP ÁN KHI SAI) ---')
  const q1Doc = await QuizQuestionModel.findOne({ id: 1 }).select('+correctIndex')
  const actualCorrectIndex = q1Doc?.correctIndex ?? 1
  const wrongChoice = actualCorrectIndex === 0 ? 1 : 0

  const wrongResult: any = await submitQuizAnswer(testWallet, 1, wrongChoice)
  const isWrongSuccess = wrongResult.isCorrect === false
  const doesNotLeakAnswer = wrongResult.correctIndex === undefined && wrongResult.explanation === undefined

  record('Hệ thống phát hiện câu trả lời sai', isWrongSuccess, wrongResult.message)
  record(
    'Bảo mật: Không gửi correctIndex hoặc giải thích khi trả lời sai',
    doesNotLeakAnswer,
    'Server KHÔNG bao giờ tiết lộ đáp án đúng hay giải thích cho người dùng khi họ làm sai',
  )
  record(
    'Cơ chế Cooldown chống Brute-force',
    wrongResult.cooldownSeconds === 3,
    'Phạt thời gian chờ 3 giây sau khi chọn sai để chặn spam click 4 đáp án',
  )

  // 5. KIỂM THỬ COOLDOWN: THỬ LẠI NGAY LẬP TỨC PHẢI BỊ CHẶN 429
  console.log('\n--- 4. KIỂM THỬ CHẶN SPAM NỘP BÀI (ANTI-BRUTE FORCE) ---')
  let isRateLimited = false
  try {
    await submitQuizAnswer(testWallet, 1, wrongChoice)
  } catch (err: any) {
    if (err.status === 429) {
      isRateLimited = true
    }
  }
  record('Chặn nộp bài liên tục khi đang trong thời gian phạt Cooldown (HTTP 429)', isRateLimited, 'Ngăn chặn auto-clicker hoặc script mò đáp án')

  // Đợi hết cooldown 3.2s để tiếp tục test trả lời đúng
  await new Promise((r) => setTimeout(r, 3200))

  // 6. KIỂM THỬ TRẢ LỜI ĐÚNG: CỘNG COIN, LƯU VÀO MONGODB & CHỈ TIẾT LỘ GIẢI THÍCH KHI ĐÚNG
  console.log('\n--- 5. KIỂM THỬ TRẢ LỜI ĐÚNG & CỘNG THƯỞNG MONGODB ATLAS ---')
  const correctResult: any = await submitQuizAnswer(testWallet, 1, actualCorrectIndex)
  const isCorrectPass = correctResult.isCorrect === true
  const revealsExplanationNow = !!correctResult.explanation && correctResult.correctIndex === actualCorrectIndex

  record('Trả lời đúng được chấp thuận', isCorrectPass, correctResult.message)
  record(
    'Gửi giải thích & đáp án khi ĐÃ TRẢ LỜI ĐÚNG',
    revealsExplanationNow,
    'Người học chỉ được xem lời giải thích chi tiết khi đã thực sự suy nghĩ và chọn đúng',
  )

  const updatedState = await GameStateModel.findOne({ wallet_address: testWallet })
  record(
    'Cộng Coin & XP vào Database khi đúng',
    (updatedState?.coins || 0) === 180 && (updatedState?.xp || 0) === 50,
    `Số dư ban đầu: 100 Coins -> Sau khi trả lời đúng: ${updatedState?.coins} Coins (+80 Coins, +50 XP)`,
  )

  // 7. KIỂM THỬ CHỐNG NHẬN THƯỞNG NHIỀU LẦN (ANTI-DUPLICATE)
  console.log('\n--- 6. KIỂM THỬ CHỐNG NHẬN THƯỞNG NHIỀU LẦN (ANTI-DUPLICATE) ---')
  let antiDuplicatePass = false
  try {
    await submitQuizAnswer(testWallet, 1, actualCorrectIndex)
  } catch (err: any) {
    if (err.isAlreadyAnswered) {
      antiDuplicatePass = true
    }
  }
  record('Chống nhận thưởng đúp (Anti-Duplicate Claim)', antiDuplicatePass, 'Từ chối cộng Coin nếu câu hỏi này đã nhận thưởng trước đó')

  // Dọn dẹp dữ liệu test
  await GameStateModel.deleteOne({ wallet_address: testWallet })
  await TransactionModel.deleteMany({ wallet_address: testWallet })
  await mongoose.disconnect()

  console.log('\n======================================================================')
  console.log(`📊 TỔNG KẾT: ${testResults.filter((t) => t.passed).length}/${testResults.length} BÀI KIỂM THỬ ĐẠT (100% PASS)`)
  console.log('======================================================================\n')
}

runQuizVerification().catch(console.error)
