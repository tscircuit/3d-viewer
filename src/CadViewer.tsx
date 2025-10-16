import { useState, useCallback, useRef, useEffect } from "react"
import { CadViewerJscad } from "./CadViewerJscad"
import CadViewerManifold from "./CadViewerManifold"
import { useContextMenu } from "./hooks/useContextMenu"
import { useGlobalDownloadGltf } from "./hooks/useGlobalDownloadGltf"
import { LayerVisibilitySubmenu } from "./LayerVisibilitySubmenu"
import { getPresentLayers, type LayerVisibility } from "./utils/layerDetection"
import packageJson from "../package.json"

const defaultLayerVisibility: LayerVisibility = {
  board: true,
  fCu: true,
  bCu: true,
  fSilkscreen: true,
  bSilkscreen: true,
  cadComponents: true,
}

export const CadViewer = (props: any) => {
  const [engine, setEngine] = useState<"jscad" | "manifold">("manifold")
  const containerRef = useRef<HTMLDivElement | null>(null)
  const submenuRef = useRef<HTMLDivElement | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [autoRotateUserToggled, setAutoRotateUserToggled] = useState(false)
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(
    defaultLayerVisibility,
  )
  const [layersSubmenuVisible, setLayersSubmenuVisible] = useState(false)
  const [presentLayers, setPresentLayers] = useState<Partial<LayerVisibility>>(
    {},
  )

  const {
    menuVisible,
    menuPos,
    menuRef,
    contextMenuEventHandlers,
    setMenuVisible,
  } = useContextMenu({ containerRef })

  // Override menuRef.contains to include both main menu and submenu
  useEffect(() => {
    if (menuRef.current) {
      const originalContains = menuRef.current.contains
      menuRef.current.contains = (node: Node) => {
        const isInMainMenu = originalContains.call(menuRef.current!, node)
        const isInSubmenu = submenuRef.current?.contains(node) || false
        return isInMainMenu || isInSubmenu
      }
    }
  }, [menuVisible]) // Re-run when menu becomes visible

  // Handle clicks outside both menus to close them
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      const isClickInsideMainMenu =
        menuRef.current && menuRef.current.contains(target)
      const isClickInsideSubmenu =
        submenuRef.current && submenuRef.current.contains(target)

      if (!isClickInsideMainMenu && !isClickInsideSubmenu) {
        setMenuVisible(false)
        setLayersSubmenuVisible(false)
      } else {
        // If click is inside either menu, prevent the useContextMenu's click outside from running
        e.stopPropagation()
      }
    }

    if (menuVisible) {
      // Add our handler first (higher priority)
      document.addEventListener("mousedown", handleClickOutside, true) // use capture phase
      document.addEventListener("touchstart", handleClickOutside, true)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside, true)
        document.removeEventListener("touchstart", handleClickOutside, true)
      }
    }
  }, [menuVisible])

  // Update present layers when circuitJson changes
  useEffect(() => {
    if (props.circuitJson) {
      setPresentLayers(getPresentLayers(props.circuitJson))
    } else {
      setPresentLayers({})
    }
  }, [props.circuitJson])

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

  const toggleLayerVisibility = useCallback((layer: keyof LayerVisibility) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }))
  }, [])

  const showAllLayers = useCallback(() => {
    setLayerVisibility(defaultLayerVisibility)
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
          layerVisibility={layerVisibility}
        />
      ) : (
        <CadViewerManifold
          {...props}
          autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
          onUserInteraction={handleUserInteraction}
          layerVisibility={layerVisibility}
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
            onClick={() => {
              downloadGltf()
              setMenuVisible(false)
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#2d313a")}
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            Download GLTF
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
              position: "relative",
            }}
            onClick={() => setLayersSubmenuVisible(!layersSubmenuVisible)}
            onMouseOver={(e) => (e.currentTarget.style.background = "#2d313a")}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "transparent"
            }}
          >
            <span>Toggle Layers</span>
            <span style={{ marginLeft: "auto", fontSize: 12 }}>▶</span>
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
      {layersSubmenuVisible && (
        <LayerVisibilitySubmenu
          ref={submenuRef}
          layerVisibility={layerVisibility}
          presentLayers={presentLayers}
          onToggleLayer={toggleLayerVisibility}
          onShowAllLayers={showAllLayers}
          position={menuPos}
        />
      )}
    </div>
  )
}
