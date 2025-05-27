import { useState, useCallback, useRef, useEffect } from "react"
import { CadViewerJscad } from "./CadViewerJscad"
import CadViewerManifold from "./CadViewerManifold"

export const CadViewer = (props: any) => {
  const [engine, setEngine] = useState<"jscad" | "manifold">("jscad")
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const interactionOriginPosRef = useRef<{ x: number; y: number } | null>(null)

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const eventX = typeof e.clientX === "number" ? e.clientX : 0
      const eventY = typeof e.clientY === "number" ? e.clientY : 0

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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      if (touch) {
        interactionOriginPosRef.current = { x: touch.clientX, y: touch.clientY }
      } else {
        interactionOriginPosRef.current = null
      }
    } else {
      // If more than one touch (e.g., pinch), or zero touches, invalidate for context menu.
      interactionOriginPosRef.current = null
    }
  }, [])

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
      }
    } else {
      // If touch is undefined despite e.touches.length === 1, invalidate.
      interactionOriginPosRef.current = null
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    setTimeout(() => {
      if (interactionOriginPosRef.current) {
        interactionOriginPosRef.current = null
      }
    }, 0)
  }, [])

  const handleMenuClick = (newEngine: "jscad" | "manifold") => {
    setEngine(newEngine)
    setMenuVisible(false)
  }

  const handleClickAway = useCallback((e: MouseEvent) => {
    const target = e.target as Node
    if (!menuRef.current || !menuRef.current.contains(target)) {
      setMenuVisible(false)
    }
  }, [])

  useEffect(() => {
    if (menuVisible) {
      document.addEventListener("mousedown", handleClickAway)
      return () => document.removeEventListener("mousedown", handleClickAway)
    }
  }, [menuVisible, handleClickAway])

  useEffect(() => {
    const stored = window.localStorage.getItem("cadViewerEngine")
    if (stored === "jscad" || stored === "manifold") {
      setEngine(stored)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem("cadViewerEngine", engine)
  }, [engine])

  const viewerKey = props.circuitJson
    ? JSON.stringify(props.circuitJson)
    : undefined

  return (
    <div
      key={viewerKey}
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
      onMouseDown={(e) => {
        if (e.button === 2) {
          interactionOriginPosRef.current = { x: e.clientX, y: e.clientY }
        } else {
          // For other mouse buttons, ensure the ref is clear.
          interactionOriginPosRef.current = null
        }
      }}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {engine === "jscad" ? (
        <CadViewerJscad {...props} />
      ) : (
        <CadViewerManifold {...props} />
      )}
      <div
        style={{
          position: "absolute",
          right: 8,
          top: 8,
          background: "#222",
          color: "#fff",
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: 12,
          opacity: 0.7,
          userSelect: "none",
        }}
      >
        Engine: <b>{engine === "jscad" ? "JSCAD" : "Manifold"}</b>
      </div>
      {menuVisible && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: menuPos.y,
            left: menuPos.x,
            background: "#23272f",
            color: "#f5f6fa",
            borderRadius: 6,
            boxShadow: "0 6px 24px 0 rgba(0,0,0,0.18)",
            zIndex: 1000,
            minWidth: 200,
            border: "1px solid #353945",
            padding: 0,
            fontSize: 15,
            fontWeight: 500,
            transition: "opacity 0.1s",
          }}
        >
          <div
            style={{
              padding: "12px 18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#f5f6fa",
              fontWeight: 500,
              borderRadius: 6,
              transition: "background 0.1s",
            }}
            onClick={() =>
              handleMenuClick(engine === "jscad" ? "manifold" : "jscad")
            }
            onMouseOver={(e) => (e.currentTarget.style.background = "#2d313a")}
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            Switch to {engine === "jscad" ? "Manifold" : "JSCAD"} Engine
            <span
              style={{
                fontSize: 12,
                marginLeft: "auto",
                opacity: 0.5,
                fontWeight: 400,
              }}
            >
              {engine === "jscad" ? "experimental" : "default"}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
