import { useState, useEffect, useCallback } from 'react'
import { soundEngine } from '../audio/SoundEngine'
import './QuizModal.css'

export interface QuizModalProps {
  isOpen: boolean
  onClose: () => void
  account: string | null
  currentUser: { address: string; token?: string } | null
  onOpenAuth?: () => void
  onRewardEarned?: (coinsEarned: number, xpEarned: number, newTotalCoins: number) => void
}

interface QuestionData {
  id: number
  topic: string
  question: string
  options: [string, string, string, string]
  rewardCoins: number
  rewardXp: number
  isAnswered: boolean
  explanation?: string
}

const BACKEND_URL = 'http://localhost:4000'

export function QuizModal({
  isOpen,
  onClose,
  account,
  currentUser,
  onOpenAuth,
  onRewardEarned,
}: QuizModalProps) {
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [answeredIds, setAnsweredIds] = useState<number[]>([])
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean
    message: string
    explanation: string
    correctIndex?: number
  } | null>(null)

  const userAddress = currentUser?.address || account

  // Load questions from Backend
  const loadQuestions = useCallback(async () => {
    setLoading(true)
    try {
      const query = userAddress ? `?address=${userAddress}` : ''
      const res = await fetch(`${BACKEND_URL}/api/quiz/questions${query}`).then((r) => r.json())
      if (res.success && Array.isArray(res.questions)) {
        setQuestions(res.questions)
        setAnsweredIds(res.answeredIds || [])
      }
    } catch (err) {
      console.error('Không thể tải câu hỏi trắc nghiệm:', err)
    } finally {
      setLoading(false)
    }
  }, [userAddress])

  useEffect(() => {
    if (isOpen) {
      loadQuestions()
      setSelectedOption(null)
      setFeedback(null)
    }
  }, [isOpen, loadQuestions])

  if (!isOpen) return null

  const currentQ = questions[currentIndex]
  const isCurrentAnswered = currentQ ? answeredIds.includes(currentQ.id) : false
  const totalQuestions = questions.length
  const completedCount = answeredIds.length

  const handleSelectQuestion = (index: number) => {
    soundEngine.playClick()
    setCurrentIndex(index)
    setSelectedOption(null)
    setFeedback(null)
  }

  const handleSubmitAnswer = async () => {
    if (!currentQ || selectedOption === null) return

    if (!userAddress) {
      alert('🔒 Bạn chưa đăng nhập tài khoản! Vui lòng đăng nhập để nhận thưởng Coin.')
      onOpenAuth?.()
      return
    }

    setSubmitting(true)
    soundEngine.playClick()

    try {
      const res = await fetch(`${BACKEND_URL}/api/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
        },
        body: JSON.stringify({
          questionId: currentQ.id,
          selectedIndex: selectedOption,
          address: userAddress,
        }),
      }).then((r) => r.json())

      if (res.success) {
        if (res.isCorrect) {
          soundEngine.playCoin()
          setFeedback({
            isCorrect: true,
            message: res.message,
            explanation: res.explanation,
            correctIndex: res.correctIndex,
          })
          setAnsweredIds((prev) => [...prev, currentQ.id])
          if (typeof res.newCoins === 'number') {
            onRewardEarned?.(res.rewardCoins, res.rewardXp, res.newCoins)
          }
        } else {
          soundEngine.playMiss()
          setFeedback({
            isCorrect: false,
            message: res.message,
            explanation: res.explanation,
            correctIndex: res.correctIndex,
          })
        }
      } else {
        alert(res.error || 'Lỗi khi gửi đáp án')
      }
    } catch (err: any) {
      console.error('Lỗi nộp bài trắc nghiệm:', err)
      alert('Không thể kết nối máy chủ để nộp bài!')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNextQuestion = () => {
    soundEngine.playClick()
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1)
      setSelectedOption(null)
      setFeedback(null)
    }
  }

  return (
    <div className="quiz-modal-overlay" onClick={onClose}>
      <div className="quiz-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="quiz-modal-header">
          <div className="quiz-header-title">
            <span className="quiz-header-icon">🎓</span>
            <div>
              <h3>Lớp Học Blockchain & Web3</h3>
              <p className="quiz-header-sub">Học kiến thức thật • Nhận In-Game Coins thật</p>
            </div>
          </div>
          <button className="quiz-close-btn" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        {/* Progress summary banner */}
        <div className="quiz-progress-banner">
          <div className="progress-stat">
            <span className="stat-label">Tiến Độ Học Tập:</span>
            <span className="stat-value purple">
              {completedCount} / {totalQuestions} Bài Học
            </span>
          </div>
          <div className="progress-stat">
            <span className="stat-label">Tổng Thưởng Đã Nhận:</span>
            <span className="stat-value gold">
              🪙 {answeredIds.reduce((sum, id) => {
                const q = questions.find((item) => item.id === id)
                return sum + (q?.rewardCoins || 0)
              }, 0)}{' '}
              Coins
            </span>
          </div>
        </div>

        {/* Login notice banner if guest */}
        {!userAddress && (
          <div className="quiz-login-alert" onClick={onOpenAuth} role="button" tabIndex={0}>
            <span>🔒 Chưa đăng nhập tài khoản. Vui lòng <strong>Đăng nhập / Kết nối ví</strong> để nhận Coin thưởng!</span>
          </div>
        )}

        {/* Questions Number Navigator */}
        <div className="quiz-nav-strip">
          {questions.map((q, idx) => {
            const isDone = answeredIds.includes(q.id)
            const isActive = idx === currentIndex
            return (
              <button
                key={q.id}
                type="button"
                className={`quiz-nav-pill ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                onClick={() => handleSelectQuestion(idx)}
                title={`Bài ${idx + 1}: ${q.topic}`}
              >
                {isDone ? '✓' : idx + 1}
              </button>
            )
          })}
        </div>

        {/* Question Body */}
        <div className="quiz-modal-body">
          {loading ? (
            <div className="quiz-loading">Đang tải ngân hàng câu hỏi Web3...</div>
          ) : currentQ ? (
            <div className="quiz-card">
              <div className="quiz-card-meta">
                <span className="quiz-topic-badge">📚 {currentQ.topic}</span>
                <span className="quiz-reward-badge">
                  +{currentQ.rewardCoins} Coins • +{currentQ.rewardXp} XP
                </span>
              </div>

              <div className="quiz-question-text">
                <span className="question-number">Câu {currentIndex + 1}:</span> {currentQ.question}
              </div>

              {/* Options */}
              <div className="quiz-options-list">
                {currentQ.options.map((optText, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx)
                  const isSelected = selectedOption === optIdx
                  const isAnsweredDone = isCurrentAnswered

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      className={`quiz-option-btn ${isSelected ? 'selected' : ''} ${
                        isAnsweredDone ? 'disabled' : ''
                      }`}
                      onClick={() => {
                        if (!isAnsweredDone) {
                          soundEngine.playClick()
                          setSelectedOption(optIdx)
                        }
                      }}
                      disabled={isAnsweredDone || submitting}
                    >
                      <span className="option-letter">{letter}</span>
                      <span className="option-text">{optText}</span>
                    </button>
                  )
                })}
              </div>

              {/* Already Answered Notice */}
              {isCurrentAnswered && (
                <div className="quiz-completed-box">
                  <div className="completed-title">✅ Bạn đã hoàn tất bài học này!</div>
                  <div className="completed-explanation">
                    <strong>Kiến thức ghi nhớ:</strong> {currentQ.explanation}
                  </div>
                </div>
              )}

              {/* Feedback Alert for Current Submission */}
              {feedback && (
                <div className={`quiz-feedback-box ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="feedback-title">
                    {feedback.isCorrect ? '🎉 CHÍNH XÁC!' : '❌ CHƯA CHÍNH XÁC!'}
                  </div>
                  <div className="feedback-message">{feedback.message}</div>
                  <div className="feedback-explanation">
                    <strong>💡 Giải thích kiến thức:</strong> {feedback.explanation}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="quiz-empty">Không có câu hỏi nào.</div>
          )}
        </div>

        {/* Footer actions */}
        <div className="quiz-modal-footer">
          <button className="quiz-footer-close-btn" onClick={onClose}>
            Đóng
          </button>

          {!isCurrentAnswered && !feedback?.isCorrect && (
            <button
              className="quiz-submit-btn"
              onClick={handleSubmitAnswer}
              disabled={selectedOption === null || submitting}
            >
              {submitting ? 'Đang Chấm Điểm...' : 'Gửi Câu Trả Lời'}
            </button>
          )}

          {(isCurrentAnswered || feedback?.isCorrect) && currentIndex < totalQuestions - 1 && (
            <button className="quiz-next-btn" onClick={handleNextQuestion}>
              Bài Học Tiếp Theo ➔
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
