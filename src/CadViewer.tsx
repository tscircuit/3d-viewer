import { useState, useCallback, useRef, useEffect } from "react"
import { CadViewerJscad } from "./CadViewerJscad"
import CadViewerManifold from "./CadViewerManifold"
import { useContextMenu } from "./hooks/useContextMenu"
import { useGlobalDownloadGltf } from "./hooks/useGlobalDownloadGltf"
import packageJson from "../package.json"
import { LayerVisibilityProvider } from "./contexts/LayerVisibilityContext"
import { AppearanceMenu } from "./components/AppearanceMenu"
import {
  MENU_HOVER_BACKGROUND,
  menuCheckColumn,
  menuContainerBase,
  menuDetailText,
  menuItemButton,
  menuSeparator,
  menuFooterText,
} from "./components/contextMenuStyles"

type ContextMenuItemProps = {
  label: string
  onClick: () => void
  detail?: string
  checked?: boolean
  role?: "menuitem" | "menuitemcheckbox"
}

const ContextMenuItem = ({
  label,
  onClick,
  detail,
  checked,
  role = "menuitem",
}: ContextMenuItemProps) => {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      role={role}
      aria-checked={
        role === "menuitemcheckbox" ? (checked ?? false) : undefined
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        ...menuItemButton,
        backgroundColor: hovered ? MENU_HOVER_BACKGROUND : "transparent",
      }}
    >
      {role === "menuitemcheckbox" ? (
        <span style={menuCheckColumn}>{checked ? "✓" : ""}</span>
      ) : (
        <span style={menuCheckColumn} aria-hidden="true">
          {checked ? "✓" : ""}
        </span>
      )}
      <span>{label}</span>
      {detail ? <span style={menuDetailText}>{detail}</span> : null}
    </button>
  )
}

const CadViewerInner = (props: any) => {
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
          role="menu"
          style={{
            ...menuContainerBase,
            position: "fixed",
            top: menuPos.y,
            left: menuPos.x,
            zIndex: 1000,
          }}
        >
          <ContextMenuItem
            label={`Switch to ${engine === "jscad" ? "Manifold" : "JSCAD"} Engine`}
            detail={engine === "jscad" ? "experimental" : "default"}
            onClick={() =>
              handleMenuClick(engine === "jscad" ? "manifold" : "jscad")
            }
          />
          <ContextMenuItem
            label="Auto rotate"
            checked={autoRotate}
            role="menuitemcheckbox"
            onClick={() => {
              toggleAutoRotate()
              setMenuVisible(false)
            }}
          />
          <ContextMenuItem
            label="Download GLTF"
            onClick={() => {
              downloadGltf()
              setMenuVisible(false)
            }}
          />
          <div style={menuSeparator} />
          <AppearanceMenu />
          <div style={menuSeparator} />
          <div style={menuFooterText}>
            @tscircuit/3d-viewer@{packageJson.version}
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
