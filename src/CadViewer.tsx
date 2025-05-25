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

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setMenuPos({ x: e.clientX, y: e.clientY })
    setMenuVisible(true)
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
      onContextMenu={handleContextMenu}
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
        onClick={() => {
          if ("ontouchstart" in window) {
            setEngine(engine === "jscad" ? "manifold" : "jscad")
          }
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
