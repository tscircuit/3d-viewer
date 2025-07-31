import { useState, useCallback, useRef, useEffect } from "react"
import { CadViewerJscad } from "./CadViewerJscad"
import CadViewerManifold from "./CadViewerManifold"
import { useContextMenu } from "./hooks/useContextMenu"
import { ComponentSearch } from "./components/ComponentSearch"
import { ComponentInfoPanel } from "./components/ComponentInfoPanel"

export const CadViewer = (props: any) => {
  const [engine, setEngine] = useState<"jscad" | "manifold">("manifold")
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [autoRotateUserToggled, setAutoRotateUserToggled] = useState(false)
  const [highlightedComponentId, setHighlightedComponentId] = useState<
    string | null
  >(null)
  const [showInfoPanel, setShowInfoPanel] = useState(false)

  const {
    menuVisible,
    menuPos,
    menuRef,
    contextMenuEventHandlers,
    setMenuVisible,
  } = useContextMenu({ containerRef })

  const handleUserInteraction = useCallback(() => {
    if (!autoRotateUserToggled) {
      setAutoRotate(false)
    }
  }, [autoRotateUserToggled])

  const toggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev)
    setAutoRotateUserToggled(true)
  }, [])

  const handleMenuClick = (newEngine: "jscad" | "manifold") => {
    setEngine(newEngine)
    setMenuVisible(false)
  }

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
      {...contextMenuEventHandlers}
    >
      {engine === "jscad" ? (
        <CadViewerJscad
          {...props}
          autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
          onUserInteraction={handleUserInteraction}
          highlightedComponentId={highlightedComponentId}
        />
      ) : (
        <CadViewerManifold
          {...props}
          autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
          onUserInteraction={handleUserInteraction}
          highlightedComponentId={highlightedComponentId}
        />
      )}
      <div
        style={{
          position: "absolute",
          right: 8,
          top: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <ComponentSearch
          circuitJson={props.circuitJson}
          onComponentSelect={(componentId) => {
            setHighlightedComponentId(componentId)
            setShowInfoPanel(!!componentId)
          }}
          selectedComponentId={highlightedComponentId}
        />
        <div
          style={{
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
            onClick={() => {
              toggleAutoRotate()
              setMenuVisible(false)
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#2d313a")}
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span style={{ marginRight: 8 }}>{autoRotate ? "✔" : ""}</span>
            Auto rotate
          </div>
        </div>
      )}

      {/* Component Info Panel */}
      {showInfoPanel && highlightedComponentId && (
        <ComponentInfoPanel
          circuitJson={props.circuitJson}
          componentId={highlightedComponentId}
          onClose={() => {
            setShowInfoPanel(false)
            setHighlightedComponentId(null)
          }}
        />
      )}
    </div>
  )
}
