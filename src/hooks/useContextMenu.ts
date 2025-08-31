import { useState, useCallback, useRef, useEffect } from "react"

interface ContextMenuProps {
  containerRef: React.RefObject<HTMLDivElement | null>
}

export const useContextMenu = ({ containerRef }: ContextMenuProps) => {
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })
  const menuRef = useRef<HTMLDivElement>(null)
  const interactionOriginPosRef = useRef<{ x: number; y: number } | null>(null)
  const longPressTimeoutRef = useRef<number | null>(null)
  const ignoreNextContextMenuRef = useRef(false)

  const clearLongPressTimeout = () => {
    if (longPressTimeoutRef.current !== null) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
  }

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const eventX = typeof e.clientX === "number" ? e.clientX : 0
      const eventY = typeof e.clientY === "number" ? e.clientY : 0

      if (ignoreNextContextMenuRef.current) {
        ignoreNextContextMenuRef.current = false
        return
      }

      if (!interactionOriginPosRef.current) {
        return
      }

      const { x: originX, y: originY } = interactionOriginPosRef.current

      const dx = Math.abs(eventX - originX)
      const dy = Math.abs(eventY - originY)
      const swipeThreshold = 10

      if (dx > swipeThreshold || dy > swipeThreshold) {
        interactionOriginPosRef.current = null
        return
      }

      setMenuPos({ x: eventX, y: eventY })
      setMenuVisible(true)
      // Reset after menu is shown or if swipe check passed but didn't swipe
      interactionOriginPosRef.current = null
    },
    [setMenuPos, setMenuVisible],
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        if (touch) {
          interactionOriginPosRef.current = {
            x: touch.clientX,
            y: touch.clientY,
          }
          clearLongPressTimeout()
          longPressTimeoutRef.current = window.setTimeout(() => {
            if (!interactionOriginPosRef.current) return
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect()
              setMenuPos({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              })
              setMenuVisible(true)
              ignoreNextContextMenuRef.current = true
            }
            interactionOriginPosRef.current = null
          }, 600)
        } else {
          interactionOriginPosRef.current = null
        }
      } else {
        // If more than one touch (e.g., pinch), or zero touches, invalidate for context menu.
        interactionOriginPosRef.current = null
        clearLongPressTimeout()
      }
    },
    [containerRef],
  )

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!interactionOriginPosRef.current || e.touches.length !== 1) {
      return
    }
    const touch = e.touches[0]
    if (touch) {
      const dx = Math.abs(touch.clientX - interactionOriginPosRef.current.x!)
      const dy = Math.abs(touch.clientY - interactionOriginPosRef.current.y!)
      const swipeThreshold = 10

      if (dx > swipeThreshold || dy > swipeThreshold) {
        interactionOriginPosRef.current = null
        clearLongPressTimeout()
      }
    } else {
      // If touch is undefined despite e.touches.length === 1, invalidate.
      interactionOriginPosRef.current = null
      clearLongPressTimeout()
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    clearLongPressTimeout()
    // Use a timeout to ensure that this runs after any potential click or context menu event
    // that might be triggered by the touch release.
    setTimeout(() => {
      if (interactionOriginPosRef.current) {
        interactionOriginPosRef.current = null
      }
    }, 0)
  }, [])

  const handleClickAway = useCallback((e: MouseEvent | TouchEvent) => {
    const target = e.target as Node
    // If the menu is visible and the click is outside the menu, hide it.
    if (menuRef.current && !menuRef.current.contains(target)) {
      setMenuVisible(false)
    }
  }, []) // setMenuVisible is stable, menuRef is a ref

  useEffect(() => {
    if (menuVisible) {
      document.addEventListener("mousedown", handleClickAway)
      document.addEventListener("touchstart", handleClickAway)
      return () => {
        document.removeEventListener("mousedown", handleClickAway)
        document.removeEventListener("touchstart", handleClickAway)
      }
    }
  }, [menuVisible, handleClickAway])

  const contextMenuEventHandlers = {
    onMouseDown: (e: React.MouseEvent) => {
      if (e.button === 2) {
        // Right click
        interactionOriginPosRef.current = { x: e.clientX, y: e.clientY }
      } else {
        interactionOriginPosRef.current = null
      }
    },
    onContextMenu: handleContextMenu,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }

  return {
    menuVisible,
    menuPos,
    menuRef,
    contextMenuEventHandlers,
    setMenuVisible, // Expose setMenuVisible for direct control if needed
  }
}
