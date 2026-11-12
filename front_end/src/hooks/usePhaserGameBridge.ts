import { useCallback, useEffect } from 'react'
import { soundEngine } from '../audio/SoundEngine'
import { showGameAlert } from '../components/NotificationModal'
import { ITEM_DEFINITIONS, type InventoryItem } from '../game/inventory/inventory'
import type { ToolId } from './useInventoryManager'
import type { AuthUser } from '../components/AuthModal'

interface UsePhaserGameBridgeProps {
  currentUser: AuthUser | null
  account: string | null
  energyRef: React.MutableRefObject<number>
  setEnergy: (val: number | ((prev: number) => number)) => void
  setMaxEnergy: (val: number | ((prev: number) => number)) => void
  setCoins: (val: number | ((prev: number) => number)) => void
  setXp: (val: number | ((prev: number) => number)) => void
  setLevel: (val: number | ((prev: number) => number)) => void
  setLevelUpMessage: (msg: string | null) => void
  setEnergyAlert: (val: { message: string; type: 'error' | 'success' } | null) => void
  setActiveNpcId: (id: string) => void
  setDialogueOpen: (open: boolean) => void
  setAuthModalOpen: (open: boolean) => void
  consumeSeed: (seedId: ToolId) => boolean
  addItem: (item: InventoryItem) => void
}

export function usePhaserGameBridge({
  currentUser,
  account,
  energyRef,
  setEnergy,
  setMaxEnergy,
  setCoins,
  setXp,
  setLevel,
  setLevelUpMessage,
  setEnergyAlert,
  setActiveNpcId,
  setDialogueOpen,
  setAuthModalOpen,
  consumeSeed,
  addItem,
}: UsePhaserGameBridgeProps) {
  // Hàm cộng XP và tính toán thăng cấp (Level Up)
  const addXP = useCallback(
    (amount: number) => {
      setXp((prevXp) => {
        const nextXp = prevXp + amount
        setLevel((prevLevel) => {
          const requiredXp = prevLevel * 100
          if (nextXp >= requiredXp) {
            const nextLevel = prevLevel + 1
            const nextMaxEnergy = 100 + (nextLevel - 1) * 5
            setMaxEnergy(nextMaxEnergy)
            setEnergy(nextMaxEnergy)
            energyRef.current = nextMaxEnergy
            soundEngine.playLevelUp()
            setLevelUpMessage(
              `🎉 LEVEL UP! Chúc mừng bạn đã đạt Cấp ${nextLevel}! Hồi phục đầy Năng lượng và Tối đa ⚡ +5.`,
            )
            setTimeout(() => setLevelUpMessage(null), 4000)
            return nextLevel
          }
          return prevLevel
        })
        return nextXp
      })
    },
    [setXp, setLevel, setMaxEnergy, setEnergy, energyRef, setLevelUpMessage],
  )

  // 1. Lắng nghe hành động tiêu hao Năng lượng từ Phaser
  useEffect(() => {
    const handleActionEnergy = (event: Event) => {
      const customEvent = event as CustomEvent<{ cost: number; action: string }>
      const cost = customEvent.detail?.cost ?? 2
      if (energyRef.current < cost) {
        customEvent.preventDefault()
        soundEngine.playExhausted()
        setEnergyAlert({
          message: `⚡ Kiệt sức! Cần ít nhất ${cost} Năng lượng. Hãy ăn nông sản hoặc cá!`,
          type: 'error',
        })
        setTimeout(() => setEnergyAlert(null), 3000)
        return
      }
      const next = Math.max(0, energyRef.current - cost)
      energyRef.current = next
      setEnergy(next)
    }

    window.addEventListener('farm-action-energy', handleActionEnergy)
    return () => window.removeEventListener('farm-action-energy', handleActionEnergy)
  }, [energyRef, setEnergy, setEnergyAlert])

  // 2. Lắng nghe gieo hạt
  useEffect(() => {
    const handlePlant = (event: Event) => {
      const customEvent = event as CustomEvent<{ seedId: ToolId; cropId: string }>
      const seedId = customEvent.detail?.seedId
      if (!seedId) return

      const success = consumeSeed(seedId)
      if (!success) {
        customEvent.preventDefault()
      }
    }

    window.addEventListener('farm-plant-crop', handlePlant)
    return () => window.removeEventListener('farm-plant-crop', handlePlant)
  }, [consumeSeed])

  // 3. Lắng nghe thu hoạch nông sản
  useEffect(() => {
    const handleFarmHarvest = (event: Event) => {
      const customEvent = event as CustomEvent
      const crop = customEvent.detail?.crop

      if (crop) {
        if (!currentUser && !account) {
          showGameAlert({
            title: 'Yêu Cầu Đăng Nhập',
            message: 'Bạn chưa đăng nhập tài khoản! Vui lòng đăng nhập để nhận Coin và EXP từ thu hoạch nông sản.',
            type: 'warning',
            icon: '🔒',
            confirmText: 'Đăng nhập ngay',
            onConfirm: () => setAuthModalOpen(true),
          })
        } else {
          if (typeof crop.harvestCoins === 'number') {
            setCoins((prev) => prev + crop.harvestCoins)
          }
          addXP(15)
        }

        const cropDef = ITEM_DEFINITIONS[crop.id as ToolId]
        if (cropDef) {
          addItem({ ...cropDef, quantity: 1 })
        }
      }
    }

    window.addEventListener('farm-harvest', handleFarmHarvest)
    return () => window.removeEventListener('farm-harvest', handleFarmHarvest)
  }, [addItem, currentUser, account, addXP, setCoins, setAuthModalOpen])

  // 4. Lắng nghe câu cá thành công
  useEffect(() => {
    const handleFishingCatch = (event: Event) => {
      const customEvent = event as CustomEvent<{
        fish?: { id: string; name: string }
        coins?: number
      }>
      const coinsReceived = customEvent.detail?.coins
      const fishObj = customEvent.detail?.fish

      if (!currentUser && !account) {
        showGameAlert({
          title: 'Yêu Cầu Đăng Nhập',
          message: 'Bạn chưa đăng nhập tài khoản! Vui lòng đăng nhập để nhận Coin và EXP khi câu cá.',
          type: 'warning',
          icon: '🔒',
          confirmText: 'Đăng nhập ngay',
          onConfirm: () => setAuthModalOpen(true),
        })
      } else {
        if (typeof coinsReceived === 'number') {
          setCoins((prev) => prev + coinsReceived)
        }
        addXP(25)
      }

      if (fishObj && ITEM_DEFINITIONS[fishObj.id as ToolId]) {
        addItem({ ...ITEM_DEFINITIONS[fishObj.id as ToolId], quantity: 1 })
      }
    }

    window.addEventListener('fishing-catch', handleFishingCatch)
    return () => window.removeEventListener('fishing-catch', handleFishingCatch)
  }, [addItem, currentUser, account, addXP, setCoins, setAuthModalOpen])

  // 5. Lắng nghe mở hộp thoại NPC
  useEffect(() => {
    const handleOpenDialogue = (e: Event) => {
      const customEvent = e as CustomEvent<{ npcId: string }>
      if (customEvent.detail?.npcId) {
        setActiveNpcId(customEvent.detail.npcId)
        setDialogueOpen(true)
      }
    }

    window.addEventListener('open-npc-dialogue', handleOpenDialogue)
    return () => window.removeEventListener('open-npc-dialogue', handleOpenDialogue)
  }, [setActiveNpcId, setDialogueOpen])

  return { addXP }
}
