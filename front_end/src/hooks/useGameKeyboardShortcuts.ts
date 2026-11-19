import { useEffect } from 'react'
import type { InventoryItem } from '../game/inventory/inventory'
import type { ToolId } from './useInventoryManager'

interface UseGameKeyboardShortcutsProps {
  toolbar: (InventoryItem | null)[]
  selectTool: (tool: ToolId) => void
  setInventoryOpen: (val: boolean | ((prev: boolean) => boolean)) => void
  setGameFiHubOpen: (val: boolean | ((prev: boolean) => boolean)) => void
  setQuizModalOpen: (val: boolean | ((prev: boolean) => boolean)) => void
}

export function useGameKeyboardShortcuts({
  toolbar,
  selectTool,
  setInventoryOpen,
  setGameFiHubOpen,
  setQuizModalOpen,
}: UseGameKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null

      // Bỏ qua nếu người chơi đang nhập văn bản trong input
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return
      }

      const key = event.key.toLowerCase()

      // 1. Phím 1-8: Chọn nhanh công cụ trên Toolbar (hỗ trợ cả phím số hàng trên và Numpad)
      let num = parseInt(key, 10)
      if (isNaN(num)) {
        const match = event.code.match(/^(?:Digit|Numpad)([1-8])$/)
        if (match) num = parseInt(match[1], 10)
      }
      if (!isNaN(num) && num >= 1 && num <= 8) {
        event.preventDefault()
        const toolItem = toolbar[num - 1]
        if (toolItem) {
          selectTool(toolItem.id)
        }
        return
      }

      // 2. Phím I: Mở / Đóng túi đồ
      if (key === 'i') {
        event.preventDefault()
        setInventoryOpen((prev) => !prev)
        return
      }

      // 3. Phím H: Mở / Đóng GameFi Hub
      if (key === 'h') {
        event.preventDefault()
        setGameFiHubOpen((prev) => !prev)
        return
      }

      // 4. Phím Q: Mở / Đóng Quiz Blockchain
      if (key === 'q') {
        event.preventDefault()
        setQuizModalOpen((prev) => !prev)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toolbar, selectTool, setInventoryOpen, setGameFiHubOpen, setQuizModalOpen])
}
