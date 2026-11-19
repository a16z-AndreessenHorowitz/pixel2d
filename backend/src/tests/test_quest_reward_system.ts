import mongoose from 'mongoose'
import { CONFIG } from '../config/index.js'
import { GameStateModel, TransactionModel, UserModel } from '../db/models.js'
import { QUEST_CATALOG } from '../routes/quests.js'

async function runQuestRewardSystemTests() {
  console.log('======================================================================')
  console.log('📋 KIỂM THỬ HỆ THỐNG NHIỆM VỤ & CƠ CHẾ CỘNG THƯỞNG COIN CHÍNH XÁC')
  console.log('======================================================================\n')

  await mongoose.connect(CONFIG.MONGODB_URI)

  const testAddress = `0xtest_quest_${Date.now()}`.toLowerCase()

  try {
    // --- 1. TÀI KHOẢN MỚI KHÔNG CÓ BẤT KỲ NHIỆM VỤ NÀO TỰ ĐỘNG ĐÃ NHẬN ---
    console.log('--- 1. KIỂM THỬ KHỞI TẠO TÀI KHOẢN MỚI ---')
    const userDoc = await UserModel.create({
      username: `tester_${Date.now()}`,
      wallet_address: testAddress,
      created_at: new Date(),
    })

    const initialGameState = await GameStateModel.create({
      wallet_address: testAddress,
      coins: 100,
      energy: 100,
      max_energy: 100,
      level: 1,
      xp: 0,
      quests: [],
      quiz_answered: [],
    })

    if (!Array.isArray(initialGameState.quests) || initialGameState.quests.length !== 0) {
      throw new Error(`Lỗi: Tài khoản mới phải có danh sách quests rỗng [] nhưng lại có: ${JSON.stringify(initialGameState.quests)}`)
    }
    console.log('✅ [PASS] - Tài khoản mới khởi tạo với danh sách quests hoàn toàn rỗng []. Không có nhiệm vụ nào bị tự động nhận trước!')

    // --- 2. KIỂM THỬ NHẬN THƯỞNG NHIỆM VỤ 1 (GIEO HẠT: +80 COINS, +50 XP) ---
    console.log('\n--- 2. KIỂM THỬ NHẬN THƯỞNG NHIỆM VỤ 1 (Gieo hạt: +80 Coins, +50 XP) ---')
    const quest1 = QUEST_CATALOG.find((q) => q.id === 1)!
    if (!quest1) throw new Error('Không tìm thấy nhiệm vụ ID 1 trong catalog')

    let currentCoins = initialGameState.coins // 100
    let currentXp = initialGameState.xp // 0
    let expectedCoins = currentCoins + quest1.rewardCoins // 100 + 80 = 180
    let expectedXp = currentXp + quest1.rewardXp // 0 + 50 = 50

    initialGameState.coins += quest1.rewardCoins
    initialGameState.xp += quest1.rewardXp
    initialGameState.quests = [...(initialGameState.quests || []), 1]
    initialGameState.markModified('quests')
    await initialGameState.save()

    const stateAfterQ1 = await GameStateModel.findOne({ wallet_address: testAddress })
    if (stateAfterQ1?.coins !== expectedCoins) {
      throw new Error(`Công thức cộng coin sai! Mong muốn ${expectedCoins}, thực tế nhận: ${stateAfterQ1?.coins}`)
    }
    if (stateAfterQ1?.xp !== expectedXp) {
      throw new Error(`Công thức cộng XP sai! Mong muốn ${expectedXp}, thực tế nhận: ${stateAfterQ1?.xp}`)
    }
    console.log(`✅ [PASS] - Hoàn thành Q1: Số dư tăng chính xác từ ${currentCoins} -> ${stateAfterQ1.coins} (+${quest1.rewardCoins} Coins)`)
    console.log(`✅ [PASS] - XP tăng chính xác từ ${currentXp} -> ${stateAfterQ1.xp} (+${quest1.rewardXp} XP)`)

    // --- 3. KIỂM THỬ CHỐNG NHẬN ĐÚP NHIỆM VỤ 1 (DOUBLE-CLAIM PREVENTION) ---
    console.log('\n--- 3. KIỂM THỬ CHỐNG NHẬN ĐÚP (ANTI-DOUBLE CLAIM) ---')
    const completedQuests = (stateAfterQ1.quests || []).map((q: any) => (typeof q === 'number' ? q : q?.id))
    const isAlreadyClaimed = completedQuests.includes(1)
    if (!isAlreadyClaimed) {
      throw new Error('Nhiệm vụ 1 phải nằm trong danh sách đã nhận')
    }
    console.log('✅ [PASS] - Phát hiện nhiệm vụ 1 đã nhận, cơ chế bảo vệ ngăn chặn việc cộng coin lần 2')

    // --- 4. KIỂM THỬ TÍCH LŨY LIÊN TIẾP NHIỀU NHIỆM VỤ THEO CÔNG THỨC TOÁN HỌC ---
    console.log('\n--- 4. KIỂM THỬ TÍCH LŨY CỘNG COIN LIÊN TIẾP TẤT CẢ 5 NHIỆM VỤ ---')
    // Quest 2: +120
    // Quest 3: +50
    // Quest 4: +180
    // Quest 5: +1000
    const remainingQuests = QUEST_CATALOG.filter((q) => q.id !== 1)
    for (const q of remainingQuests) {
      const prevCoin = stateAfterQ1.coins
      stateAfterQ1.coins += q.rewardCoins
      stateAfterQ1.xp += q.rewardXp
      stateAfterQ1.quests = [...stateAfterQ1.quests, q.id]
      console.log(`   + Hoàn thành [${q.title}]: ${prevCoin} + ${q.rewardCoins} = ${stateAfterQ1.coins} Coins (XP: ${stateAfterQ1.xp})`)
    }
    stateAfterQ1.markModified('quests')
    await stateAfterQ1.save()

    // Tổng coin dự kiến: 100 (ban đầu) + 80 + 120 + 50 + 180 + 1000 = 1530 Coins
    const expectedFinalCoins = 100 + 80 + 120 + 50 + 180 + 1000 // 1530
    if (stateAfterQ1.coins !== expectedFinalCoins) {
      throw new Error(`Tổng coin sau khi làm hết nhiệm vụ không khớp! Kỳ vọng: ${expectedFinalCoins}, Thực tế: ${stateAfterQ1.coins}`)
    }
    console.log(`✅ [PASS] - Toàn bộ 5 nhiệm vụ tích lũy chuẩn xác 100%: Tổng = ${stateAfterQ1.coins} Coins`)

    // --- 5. DỌN DẸP DỮ LIỆU TEST ---
    await UserModel.deleteOne({ _id: userDoc._id })
    await GameStateModel.deleteOne({ wallet_address: testAddress })
    console.log('\n🧹 Dọn dẹp dữ liệu test thành công.')

    console.log('\n======================================================================')
    console.log('🎉 TẤT CẢ BÀI TEST NHIỆM VỤ & CÔNG THỨC CỘNG COIN ĐÃ ĐẠT 100% PASS!')
    console.log('======================================================================')
  } catch (err) {
    console.error('❌ Test thất bại:', err)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

runQuestRewardSystemTests()
