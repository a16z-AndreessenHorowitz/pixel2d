import { Router, Response } from 'express'
import { GameStateModel, TransactionModel } from '../db/models.js'
import { optionalAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const quizRouter = Router()

export interface BlockchainQuestion {
  id: number
  topic: string
  question: string
  options: [string, string, string, string]
  correctIndex: number // 0, 1, 2, or 3 (Lưu bảo mật ở Backend)
  rewardCoins: number
  rewardXp: number
  explanation: string
}

export const BLOCKCHAIN_QUIZ_CATALOG: BlockchainQuestion[] = [
  {
    id: 1,
    topic: 'Bảo Mật Ví',
    question: 'Khóa riêng tư (Private Key) của ví Web3 có vai trò gì quan trọng nhất?',
    options: [
      'Là mật khẩu công khai để người khác gửi coin cho bạn',
      'Là chìa khóa tối cao nắm quyền kiểm soát và chuyển toàn bộ tài sản trong ví',
      'Chỉ là mã định danh để đăng nhập vào mạng xã hội',
      'Không quan trọng vì có thể nhờ đội ngũ hỗ trợ cấp lại nếu bị mất',
    ],
    correctIndex: 1,
    rewardCoins: 80,
    rewardXp: 50,
    explanation:
      'Khóa riêng tư (Private Key) là bằng chứng sở hữu duy nhất đối với tài sản on-chain. Ai có Private Key người đó nắm toàn quyền sở hữu ví. Tuyệt đối KHÔNG BAO GIỜ chia sẻ cho bất kỳ ai!',
  },
  {
    id: 2,
    topic: 'Bảo Mật Ví',
    question: 'Khi tạo ví mới, bạn nhận được 12 hoặc 24 từ khôi phục (Seed Phrase). Cách lưu trữ nào là AN TOÀN NHẤT?',
    options: [
      'Chụp ảnh màn hình lưu trên điện thoại và tải lên Google Drive / iCloud',
      'Nhắn tin gửi qua Zalo, Messenger hoặc email để lưu trữ',
      'Ghi cẩn thận ra giấy và cất giữ ở nơi an toàn, bí mật, không kết nối Internet',
      'Đăng công khai lên mạng xã hội để không bao giờ quên',
    ],
    correctIndex: 2,
    rewardCoins: 80,
    rewardXp: 50,
    explanation:
      'Seed Phrase lưu trên thiết bị điện tử có thể bị hacker đánh cắp nếu máy nhiễm mã độc. Cách an toàn kinh điển nhất là ghi ra giấy hoặc khắc lên kim loại và bảo quản ngoại tuyến (offline).',
  },
  {
    id: 3,
    topic: 'Mạng Ethereum',
    question: 'Phí Gas (Gas Fee) trên mạng lưới Ethereum dùng để chi trả cho ai và nhằm mục đích gì?',
    options: [
      'Nộp thuế cho chính phủ và ngân hàng thế giới',
      'Chi trả cho các thợ đào / người xác thực (Validators) để xử lý và bảo vệ giao dịch',
      'Là tiền hoa hồng trả cho công ty sản xuất máy tính',
      'Phí bản quyền thuê đường truyền cáp quang Internet',
    ],
    correctIndex: 1,
    rewardCoins: 80,
    rewardXp: 50,
    explanation:
      'Gas là đơn vị đo lường công sức tính toán cần thiết để thực thi giao dịch hoặc Smart Contract trên Ethereum. Phí này trả cho Validator để khuyến khích họ duy trì mạng lưới phi tập trung.',
  },
  {
    id: 4,
    topic: 'Hợp Đồng Thông Minh',
    question: 'Smart Contract (Hợp đồng thông minh) trên Blockchain là gì?',
    options: [
      'Bản hợp đồng giấy được quét scan thành file PDF',
      'Đoạn chương trình tự động thực thi các điều khoản khi thỏa mãn điều kiện lập trình mà không cần bên thứ ba',
      'Một loại virus máy tính chuyên đánh cắp dữ liệu',
      'Hợp đồng lao động ký kết giữa người chơi và nhà phát triển game',
    ],
    correctIndex: 1,
    rewardCoins: 100,
    rewardXp: 60,
    explanation:
      'Smart Contract chạy trực tiếp trên máy ảo EVM của Blockchain. Khi các điều kiện được định sẵn xảy ra (ví dụ nộp đủ coin), chương trình sẽ tự động chuyển tài sản một cách minh bạch, không ai có thể can thiệp sửa đổi.',
  },
  {
    id: 5,
    topic: 'Tiêu Chuẩn Token',
    question: 'Chuẩn Token ERC-20 trên mạng Ethereum đại diện cho loại tài sản nào?',
    options: [
      'Tài sản độc bản không thể thay thế (như tranh nghệ thuật NFT)',
      'Tài sản có thể thay thế (Fungible Token), ví dụ như $PIXEL, USDT, DAI',
      'Tài khoản ngân hàng truyền thống định danh theo CCCD',
      'Một loại phần cứng card đồ họa để chơi game',
    ],
    correctIndex: 1,
    rewardCoins: 100,
    rewardXp: 60,
    explanation:
      'ERC-20 là tiêu chuẩn kỹ thuật phổ biến nhất cho Token có thể hoán đổi đồng nhất trên Ethereum: 1 đồng $PIXEL của bạn có giá trị hoàn toàn tương đương với 1 đồng $PIXEL của người khác.',
  },
  {
    id: 6,
    topic: 'Kinh Tế Pixel2D',
    question: 'Trong tựa game Pixel2D GameFi, tỷ giá quy đổi In-Game Coins sang token $PIXEL on-chain là bao nhiêu?',
    options: [
      '1 Coin = 1 $PIXEL',
      '1,000 Coins = 10 $PIXEL (Tỷ lệ 100 Coins = 1 $PIXEL)',
      '10,000 Coins = 1 $PIXEL',
      'Không thể đổi được',
    ],
    correctIndex: 1,
    rewardCoins: 100,
    rewardXp: 60,
    explanation:
      'Dự án áp dụng tỷ lệ cố định: 1,000 In-game Coins cày được trong nông trại đổi được 10 token $PIXEL đúc trực tiếp về ví MetaMask trên mạng Sepolia Testnet!',
  },
  {
    id: 7,
    topic: 'Công Nghệ EIP-712',
    question: 'Tại sao cơ chế EIP-712 Sign-to-Mint trong Pixel2D giúp chủ game KHÔNG TỐN PHÍ GAS khi phát thưởng?',
    options: [
      'Vì giao dịch chạy trên mạng không có phí gas',
      'Vì máy chủ Backend chỉ ký xác thực trên RAM, người chơi là người gửi chữ ký lên Contract và tự trả gas',
      'Vì game sử dụng tiền giả không cần xác thực',
      'Vì ngân hàng thanh toán toàn bộ chi phí gas cho hệ thống',
    ],
    correctIndex: 1,
    rewardCoins: 120,
    rewardXp: 70,
    explanation:
      'Với EIP-712, máy chủ Backend đóng vai trò cấp một "phiếu lĩnh thưởng mật mã". Người chơi cầm phiếu đó nộp lên Smart Contract qua MetaMask và tự thanh toán phí mạng Sepolia để đúc token về ví.',
  },
  {
    id: 8,
    topic: 'Mạng Thử Nghiệm',
    question: 'Mạng Ethereum Sepolia Testnet khác gì so với mạng Ethereum Mainnet?',
    options: [
      'Sepolia dùng tiền ETH thật có giá trị hàng ngàn đô la',
      'Sepolia là môi trường thử nghiệm dùng token ETH giả lập (Faucet miễn phí) để lập trình viên và người chơi thử nghiệm',
      'Sepolia không cho phép chạy Smart Contract',
      'Sepolia chỉ hoạt động khi không có kết nối mạng Internet',
    ],
    correctIndex: 1,
    rewardCoins: 80,
    rewardXp: 50,
    explanation:
      'Sepolia là mạng thử nghiệm chính thức của Ethereum. Người chơi có thể xin Sepolia ETH miễn phí từ Faucet để trả phí gas thử nghiệm tất cả các tính năng Web3 mà không mất tiền thật.',
  },
  {
    id: 9,
    topic: 'Cảnh Giác Lừa Đảo',
    question: 'Một trang web hoặc tin nhắn Discord tự xưng Admin game yêu cầu bạn nhập 12 từ Seed Phrase để nhận 10,000 $PIXEL miễn phí. Bạn nên làm gì?',
    options: [
      'Nhập ngay lập tức để kịp nhận quà khuyến mãi',
      'Tuyệt đối KHÔNG nhập và chặn/báo cáo ngay, vì đây là hành vi lừa đảo câu trộm ví (Phishing Scam)',
      'Gửi một nửa cụm từ trước để kiểm tra',
      'Mượn ví của bạn bè để nhập thay',
    ],
    correctIndex: 1,
    rewardCoins: 120,
    rewardXp: 70,
    explanation:
      'Quy tắc vàng trong Web3: Bất kỳ ai yêu cầu Private Key hoặc 12 từ Seed Phrase đều là KẺ LỪA ĐẢO 100%! Không có ngoại lệ. Các dự án chân chính không bao giờ đòi hỏi thông tin này.',
  },
  {
    id: 10,
    topic: 'Đặc Tính Blockchain',
    question: 'Đặc tính cốt lõi nổi bật nhất của công nghệ Blockchain là gì?',
    options: [
      'Dữ liệu có thể tùy ý bị quản trị viên sửa đổi và xóa bỏ bất cứ lúc nào',
      'Phi tập trung, minh bạch, dữ liệu chỉ có thể thêm vào và bất biến không thể làm giả',
      'Tốc độ tải chậm hơn so với viết chữ trên giấy',
      'Chỉ hoạt động được vào ban ngày',
    ],
    correctIndex: 1,
    rewardCoins: 100,
    rewardXp: 60,
    explanation:
      'Nhờ cơ chế đồng thuận phân tán và mật mã học, một khi dữ liệu giao dịch đã được ghi vào chuỗi khối (Block), không một cá nhân hay tổ chức nào có thể đảo ngược hay xóa bỏ nó.',
  },
]

// 1. GET /api/quiz/questions - Lấy danh sách câu hỏi (ẨN đáp án đúng & giải thích trước khi làm)
quizRouter.get('/questions', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = (req.query.address as string) || req.user?.address
  const isLoggedIn = !!address

  let answeredIds: number[] = []

  if (address) {
    const normalizedAddr = address.toLowerCase()
    const state = await GameStateModel.findOne({ wallet_address: normalizedAddr })
    if (state && Array.isArray(state.quiz_answered)) {
      answeredIds = state.quiz_answered
    }
  }

  // Lọc dữ liệu bảo mật: Nếu đã trả lời đúng -> gửi kèm explanation; nếu chưa -> giấu correctIndex
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

  res.json({
    success: true,
    isLoggedIn,
    totalQuestions: BLOCKCHAIN_QUIZ_CATALOG.length,
    answeredCount: answeredIds.length,
    totalRewards,
    earnedRewards,
    answeredIds,
    questions: safeQuestions,
  })
})

// 2. POST /api/quiz/submit - Nộp đáp án câu hỏi trắc nghiệm
quizRouter.post('/submit', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = req.body.address || req.user?.address
  const questionId = Number(req.body.questionId)
  const selectedIndex = Number(req.body.selectedIndex)

  // 1. Kiểm tra đăng nhập
  if (!address) {
    return res.status(401).json({
      success: false,
      error: 'Bạn chưa đăng nhập tài khoản! Vui lòng đăng nhập để tham gia làm bài trắc nghiệm và nhận Coin.',
    })
  }

  if (isNaN(questionId) || isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) {
    return res.status(400).json({ success: false, error: 'Dữ liệu câu hỏi hoặc đáp án không hợp lệ (Phải từ 0 đến 3)' })
  }

  const question = BLOCKCHAIN_QUIZ_CATALOG.find((q) => q.id === questionId)
  if (!question) {
    return res.status(404).json({ success: false, error: `Không tìm thấy câu hỏi ID ${questionId}` })
  }

  const normalizedAddr = address.toLowerCase()

  try {
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

    // 2. Chống nhận thưởng đúp (Nếu câu này đã nhận thưởng rồi)
    if (currentAnswered.includes(questionId)) {
      return res.status(400).json({
        success: false,
        error: `Bạn đã hoàn thành và nhận phần thưởng của câu hỏi "${question.question}" trước đó rồi!`,
        isAlreadyAnswered: true,
        explanation: question.explanation,
      })
    }

    // 3. So khớp đáp án
    const isCorrect = selectedIndex === question.correctIndex

    if (!isCorrect) {
      return res.json({
        success: true,
        isCorrect: false,
        message: 'Rất tiếc! Câu trả lời của bạn chưa chính xác. Hãy đọc phần giải thích kiến thức bên dưới và thử lại nhé!',
        correctIndex: question.correctIndex,
        explanation: question.explanation,
      })
    }

    // 4. Đúng: Cộng Coin và XP vào Database Cloud MongoDB Atlas
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

    res.json({
      success: true,
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
    })
  } catch (err: any) {
    console.error('Lỗi nộp bài trắc nghiệm:', err)
    res.status(500).json({ success: false, error: 'Lỗi server khi nộp bài trắc nghiệm: ' + err.message })
  }
})
