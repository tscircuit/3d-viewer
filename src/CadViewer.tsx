import { useState, useCallback, useRef, useEffect, forwardRef } from "react"
import { CadViewerJscad } from "./CadViewerJscad"
import CadViewerManifold from "./CadViewerManifold"
import { useContextMenu } from "./hooks/useContextMenu"
import { useSaveGltfAs } from "./hooks/exporter/gltf"
import packageJson from "../package.json"
import type * as THREE from "three"

export const CadViewer = forwardRef<THREE.Object3D, any>((props, ref) => {
  const [engine, setEngine] = useState<"jscad" | "manifold">("manifold")
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [autoRotateUserToggled, setAutoRotateUserToggled] = useState(false)

  const {
    menuVisible,
    menuPos,
    menuRef,
    contextMenuEventHandlers,
    setMenuVisible,
  } = useContextMenu({ containerRef })

  // GLTF export functionality
  const [sceneRef, saveGltfAs] = useSaveGltfAs()

  // Forward the ref to the child component
  const forwardRef = ref || sceneRef

  const autoRotateUserToggledRef = useRef(autoRotateUserToggled)
  autoRotateUserToggledRef.current = autoRotateUserToggled

  const handleUserInteraction = useCallback(() => {
    // Only stop auto-rotation if it wasn't user-toggled and it's not a right-click
    // Right-clicks are handled by the context menu and shouldn't stop auto-rotation
    if (!autoRotateUserToggledRef.current) {
      setAutoRotate(false)
    }
  }, [])

  const toggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev)
    setAutoRotateUserToggled(true)
  }, [])

  const handleMenuClick = (newEngine: "jscad" | "manifold") => {
    setEngine(newEngine)
    setMenuVisible(false)
  }

  const handleDownloadGltf = useCallback(() => {
    saveGltfAs("pcb.glb")
    setMenuVisible(false)
  }, [saveGltfAs, setMenuVisible])

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
          ref={forwardRef}
          autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
          onUserInteraction={handleUserInteraction}
        >
          {props.children}
        </CadViewerJscad>
      ) : (
        <CadViewerManifold
          {...props}
          ref={forwardRef}
          autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
          onUserInteraction={handleUserInteraction}
        >
          {props.children}
        </CadViewerManifold>
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
            onClick={handleDownloadGltf}
            onMouseOver={(e) => (e.currentTarget.style.background = "#2d313a")}
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            Download GLTF
          </div>
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
})
