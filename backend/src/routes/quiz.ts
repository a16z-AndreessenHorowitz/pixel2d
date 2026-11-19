import { Router, Response } from 'express'
import { getSafeQuizQuestions, getSafeQuizQuestionById, submitQuizAnswer } from '../services/quizService.js'
import { optionalAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../types/index.js'

export { BLOCKCHAIN_QUIZ_CATALOG, type BlockchainQuestion } from '../constants/quizQuestions.js'
export const quizRouter = Router()

// 1. GET /api/quiz/questions - Lấy danh sách câu hỏi an toàn (ẩn hoàn toàn correctIndex từ MongoDB)
quizRouter.get('/questions', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = (req.query.address as string) || req.user?.address
  try {
    const data = await getSafeQuizQuestions(address)
    res.json({ success: true, ...data })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 2. GET /api/quiz/question/:id - Lấy chi tiết 1 câu hỏi duy nhất (tránh tải toàn bộ đề thi)
quizRouter.get('/question/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = (req.query.address as string) || req.user?.address
  const questionId = Number(req.params.id)
  try {
    const question = await getSafeQuizQuestionById(questionId, address)
    res.json({ success: true, question })
  } catch (err: any) {
    const status = err.status || 500
    res.status(status).json({ success: false, error: err.message })
  }
})

// 3. POST /api/quiz/submit - Nộp đáp án câu hỏi trắc nghiệm (bảo mật tuyệt đối, không lộ đáp án khi sai)
quizRouter.post('/submit', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = req.body.address || req.user?.address
  const questionId = Number(req.body.questionId)
  const selectedIndex = Number(req.body.selectedIndex)

  if (!address) {
    return res.status(401).json({
      success: false,
      error: 'Bạn chưa đăng nhập tài khoản! Vui lòng đăng nhập để tham gia làm bài trắc nghiệm và nhận Coin.',
    })
  }

  try {
    const result = await submitQuizAnswer(address, questionId, selectedIndex)
    res.json({ success: true, ...result })
  } catch (err: any) {
    const status = err.status || 500
    res.status(status).json({
      success: false,
      error: err.message,
      isAlreadyAnswered: err.isAlreadyAnswered,
      explanation: err.explanation,
      cooldownSeconds: err.cooldownSeconds,
    })
  }
})
