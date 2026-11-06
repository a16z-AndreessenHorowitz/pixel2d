import { Router, Response } from 'express'
import { GameStateModel, TransactionModel, UserModel } from '../db/models.js'
import { optionalAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const questRouter = Router()

export interface QuestDefinition {
  id: number
  title: string
  description: string
  rewardCoins: number
  rewardXp: number
  category: 'farming' | 'harvest' | 'explore' | 'upgrade' | 'special'
}

export const QUEST_CATALOG: QuestDefinition[] = [
  {
    id: 1,
    title: 'Gieo 5 luống cà rốt',
    description: 'Hoàn tất một lượt trồng cơ bản trên khu đất đầu tiên.',
    rewardCoins: 80,
    rewardXp: 50,
    category: 'farming',
  },
  {
    id: 2,
    title: 'Thu hoạch mùa sáng',
    description: 'Thu gom nông sản đã chín và chuẩn bị kho cho lượt tiếp theo.',
    rewardCoins: 120,
    rewardXp: 80,
    category: 'harvest',
  },
  {
    id: 3,
    title: 'Ghé thăm bảng đổi thưởng GameFi',
    description: 'Kiểm tra tỷ giá quy đổi 1,000 Coins lấy 10 $PIXEL on-chain.',
    rewardCoins: 50,
    rewardXp: 30,
    category: 'explore',
  },
  {
    id: 4,
    title: 'Nâng cấp kho nhỏ',
    description: 'Mở thêm chỗ chứa nông sản để nhận nhiều nhiệm vụ hơn.',
    rewardCoins: 180,
    rewardXp: 100,
    category: 'upgrade',
  },
  {
    id: 5,
    title: 'Thử thách nông dân chăm chỉ',
    description: 'Cày cuốc tích lũy và hoàn thành mùa vụ lớn để nhận 1,000 Coin đổi token $PIXEL.',
    rewardCoins: 1000,
    rewardXp: 500,
    category: 'special',
  },
]

// 1. GET /api/quests - Lấy danh sách nhiệm vụ và trạng thái của người chơi
questRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = (req.query.address as string) || req.user?.address
  const isLoggedIn = !!address

  let completedQuestIds: number[] = []

  if (address) {
    const normalizedAddr = address.toLowerCase()
    const state = await GameStateModel.findOne({ wallet_address: normalizedAddr })
    if (state && Array.isArray(state.quests)) {
      completedQuestIds = state.quests
        .map((q: any) => (typeof q === 'number' ? q : q?.id))
        .filter((id: any) => typeof id === 'number')
    }
  }

  const questsWithStatus = QUEST_CATALOG.map((quest) => ({
    ...quest,
    isCompleted: completedQuestIds.includes(quest.id),
  }))

  res.json({
    success: true,
    isLoggedIn,
    completedQuestIds,
    quests: questsWithStatus,
  })
})

// 2. POST /api/quests/claim - Nhận thưởng Coin từ nhiệm vụ
// Yêu cầu bắt buộc: Người dùng phải đăng nhập tài khoản / kết nối ví
questRouter.post('/claim', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = req.body.address || req.user?.address
  const questId = Number(req.body.questId)

  // Kiểm tra đăng nhập
  if (!address) {
    return res.status(401).json({
      success: false,
      error: 'Bạn chưa đăng nhập tài khoản! Vui lòng đăng nhập hoặc kết nối ví để nhận Coin thưởng nhiệm vụ.',
    })
  }

  if (isNaN(questId)) {
    return res.status(400).json({ success: false, error: 'Thiếu hoặc sai mã questId' })
  }

  const quest = QUEST_CATALOG.find((q) => q.id === questId)
  if (!quest) {
    return res.status(404).json({ success: false, error: `Không tìm thấy nhiệm vụ ID ${questId}` })
  }

  const normalizedAddr = address.toLowerCase()

  try {
    let state = await GameStateModel.findOne({ wallet_address: normalizedAddr })
    if (!state) {
      state = await GameStateModel.create({
        wallet_address: normalizedAddr,
        coins: 100,
        energy: 100,
        max_energy: 100,
        level: 1,
        xp: 0,
        inventory: [],
        toolbar: [],
        plots: [],
        quests: [],
      })
    }

    const currentCompleted = Array.isArray(state.quests)
      ? state.quests
          .map((q: any) => (typeof q === 'number' ? q : q?.id))
          .filter((id: any) => typeof id === 'number')
      : []

    // Kiểm tra chống nhận đúp (Double-claim prevention)
    if (currentCompleted.includes(questId)) {
      return res.status(400).json({
        success: false,
        error: `Nhiệm vụ "${quest.title}" đã được nhận thưởng trước đó rồi!`,
      })
    }

    // Cộng Coin và XP cho người chơi
    state.coins += quest.rewardCoins
    state.xp = (state.xp || 0) + quest.rewardXp

    // Tính toán Level Up nếu đủ XP (ví dụ mỗi 200 XP lên 1 cấp)
    const newLevel = Math.floor(state.xp / 200) + 1
    if (newLevel > (state.level || 1)) {
      state.level = newLevel
    }

    // Đánh dấu nhiệm vụ đã nhận
    currentCompleted.push(questId)
    state.quests = [...currentCompleted]
    state.markModified('quests')
    state.updated_at = new Date()
    await state.save()

    // Ghi nhật ký Transaction
    await TransactionModel.create({
      wallet_address: normalizedAddr,
      type: 'quest_reward',
      amount: `+${quest.rewardCoins} Coins`,
      details: `Hoàn thành nhiệm vụ: ${quest.title} (+${quest.rewardCoins} Coins, +${quest.rewardXp} XP)`,
      created_at: new Date(),
    })

    res.json({
      success: true,
      message: `🎉 Chúc mừng! Bạn đã nhận thành công ${quest.rewardCoins} Coins từ nhiệm vụ "${quest.title}"!`,
      data: {
        questId,
        rewardCoins: quest.rewardCoins,
        rewardXp: quest.rewardXp,
        newCoins: state.coins,
        newLevel: state.level,
        newXp: state.xp,
        completedQuestIds: currentCompleted,
      },
    })
  } catch (err: any) {
    console.error('Lỗi nhận thưởng nhiệm vụ:', err)
    res.status(500).json({ success: false, error: 'Lỗi server khi nhận thưởng: ' + err.message })
  }
})
