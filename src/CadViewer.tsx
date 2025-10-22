import { useState, useCallback, useRef, useEffect } from "react"
import { CadViewerJscad } from "./CadViewerJscad"
import CadViewerManifold from "./CadViewerManifold"
import { useContextMenu } from "./hooks/useContextMenu"
import { useGlobalDownloadGltf } from "./hooks/useGlobalDownloadGltf"
import packageJson from "../package.json"
import {
  LayerVisibilityProvider,
  useLayerVisibility,
} from "./contexts/LayerVisibilityContext"
import { AppearanceMenu } from "./components/AppearanceMenu"

const CadViewerInner = (props: any) => {
  const [engine, setEngine] = useState<"jscad" | "manifold">("manifold")
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [autoRotateUserToggled, setAutoRotateUserToggled] = useState(false)
  const { visibility, toggleLayer } = useLayerVisibility()

  const {
    menuVisible,
    menuPos,
    menuRef,
    contextMenuEventHandlers,
    setMenuVisible,
  } = useContextMenu({ containerRef })

  const autoRotateUserToggledRef = useRef(autoRotateUserToggled)
  autoRotateUserToggledRef.current = autoRotateUserToggled

  const handleUserInteraction = useCallback(() => {
    if (!autoRotateUserToggledRef.current) {
      setAutoRotate(false)
    }
  }, [])

  const toggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev)
    setAutoRotateUserToggled(true)
  }, [])

  const downloadGltf = useGlobalDownloadGltf()

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
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        userSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
      {...contextMenuEventHandlers}
    >
      {engine === "jscad" ? (
        <CadViewerJscad
          {...props}
          autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
          onUserInteraction={handleUserInteraction}
        />
      ) : (
        <CadViewerManifold
          {...props}
          autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
          onUserInteraction={handleUserInteraction}
        />
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
            background: "#2c313a",
            color: "#e4e4e7",
            borderRadius: 8,
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)",
            zIndex: 1000,
            minWidth: 220,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            padding: "4px 0",
            fontSize: 14,
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              margin: "0 4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#e4e4e7",
              fontWeight: 400,
              borderRadius: 4,
              transition: "background 0.15s ease",
            }}
            onClick={() =>
              handleMenuClick(engine === "jscad" ? "manifold" : "jscad")
            }
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)")}
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            Switch to {engine === "jscad" ? "Manifold" : "JSCAD"} Engine
            <span
              style={{
                fontSize: 11,
                marginLeft: "auto",
                opacity: 0.6,
                fontWeight: 400,
              }}
            >
              {engine === "jscad" ? "experimental" : "default"}
            </span>
          </div>
          <div
            style={{
              padding: "8px 12px",
              margin: "0 4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#e4e4e7",
              fontWeight: 400,
              borderRadius: 4,
              transition: "background 0.15s ease",
            }}
            onClick={() => {
              toggleAutoRotate()
              setMenuVisible(false)
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)")}
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span style={{ width: 16, textAlign: "center", fontSize: 12 }}>{autoRotate ? "✓" : ""}</span>
            Auto rotate
          </div>
          <div
            style={{
              padding: "8px 12px",
              margin: "0 4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#e4e4e7",
              fontWeight: 400,
              borderRadius: 4,
              transition: "background 0.15s ease",
            }}
            onClick={() => {
              downloadGltf()
              setMenuVisible(false)
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)")}
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span style={{ width: 16 }}></span>
            Download GLTF
          </div>
          <AppearanceMenu />
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "8px 0",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              marginTop: "8px",
            }}
          >
            <span
              style={{
                fontSize: 10,
                opacity: 0.6,
                fontWeight: 300,
                color: "#c0c0c0",
              }}
            >
              @tscircuit/3d-viewer@{packageJson.version}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export const CadViewer = (props: any) => {
  return (
    <LayerVisibilityProvider>
      <CadViewerInner {...props} />
    </LayerVisibilityProvider>
  )
}
