import type React from "react"
import { useState, useRef, useEffect } from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { AppearanceMenu } from "./AppearanceMenu"
import type { CameraPreset } from "../hooks/cameraAnimation"
import { useCameraController } from "../contexts/CameraControllerContext"
import type { CustomCameraView } from "../hooks/useCustomCameraViews"
import packageJson from "../../package.json"
import {
  CheckIcon,
  ChevronRightIcon,
  DotIcon,
  TrashIcon,
  SaveIcon,
} from "./Icons"
import { zIndexMap } from "../../lib/utils/z-index-map"

interface ContextMenuProps {
  menuRef: React.RefObject<HTMLDivElement | null>
  menuPos: { x: number; y: number }
  engine: "jscad" | "manifold"
  cameraPreset: CameraPreset
  autoRotate: boolean
  onEngineSwitch: (engine: "jscad" | "manifold") => void
  onCameraPresetSelect: (preset: CameraPreset) => void
  onAutoRotateToggle: () => void
  onDownloadGltf: () => void
  onOpenKeyboardShortcuts: () => void
  customViews: CustomCameraView[]
  onSaveCustomView: (name: string) => void
  onDeleteCustomView: (id: string) => void
}

const builtInCameraOptions: CameraPreset[] = [
  "Custom",
  "Top Center Angled",
  "Top Down",
  "Top Left Corner",
  "Top Right Corner",
  "Left Sideview",
  "Right Sideview",
  "Front",
]

const contentStyles: React.CSSProperties = {
  backgroundColor: "#262626",
  color: "#fafafa",
  borderRadius: 6,
  boxShadow:
    "0px 12px 48px -12px rgba(0, 0, 0, 0.5), 0px 8px 24px -8px rgba(0, 0, 0, 0.3)",
  border: "1px solid #333333",
  padding: "4px",
  minWidth: 160,
  zIndex: zIndexMap.contextMenu,
  fontSize: 14,
  fontWeight: 400,
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const itemStyles: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 6,
  cursor: "default",
  outline: "none",
  userSelect: "none",
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#fafafa",
  fontWeight: 400,
  fontSize: 14,
  transition: "background-color 0.15s ease, color 0.15s ease",
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const itemPaddingStyles: React.CSSProperties = {
  paddingLeft: 32,
  paddingTop: 6,
  paddingBottom: 6,
  paddingRight: 8,
}

const iconContainerStyles: React.CSSProperties = {
  width: 16,
  height: 16,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  flexShrink: 0,
}

const separatorStyles: React.CSSProperties = {
  height: 1,
  backgroundColor: "#ffffff1a",
  margin: "4px 0",
}

const badgeStyles: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.65,
  fontWeight: 500,
  color: "#b5b5bcff",
  backgroundColor: "rgba(161, 161, 170, 0.1)",
  padding: "2px 6px",
  borderRadius: 4,
  border: "1px solid rgba(161, 161, 170, 0.2)",
  letterSpacing: "0.3px",
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  menuRef,
  menuPos,
  engine,
  cameraPreset,
  autoRotate,
  onEngineSwitch,
  onCameraPresetSelect,
  onAutoRotateToggle,
  onDownloadGltf,
  onOpenKeyboardShortcuts,
  customViews,
  onSaveCustomView,
  onDeleteCustomView,
}) => {
  const { cameraType, setCameraType } = useCameraController()
  const [cameraSubOpen, setCameraSubOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [isNamingView, setIsNamingView] = useState(false)
  const [newViewName, setNewViewName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the input when naming mode is activated
  useEffect(() => {
    if (isNamingView && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isNamingView])

  const handleSaveNewView = () => {
    const trimmedName = newViewName.trim()
    if (trimmedName) {
      onSaveCustomView(trimmedName)
      setNewViewName("")
      setIsNamingView(false)
    }
  }

  // Build the list of camera options including custom views
  const cameraOptions: CameraPreset[] = [
    ...builtInCameraOptions,
    ...customViews.map((view) => `custom:${view.id}` as CameraPreset),
  ]

  const getDisplayName = (preset: CameraPreset): string => {
    if (preset.startsWith("custom:")) {
      const id = preset.slice(7)
      const view = customViews.find((v) => v.id === id)
      return view?.name ?? "Custom View"
    }
    return preset
  }

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: menuPos.x,
        top: menuPos.y,
        width: 0,
        height: 0,
      }}
    >
      <DropdownMenu.Root open={true} modal={false}>
        <DropdownMenu.Trigger asChild>
          <div style={{ position: "absolute", width: 1, height: 1 }} />
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            style={contentStyles}
            collisionPadding={10}
            avoidCollisions={true}
            sideOffset={0}
            align="start"
          >
            {/* Camera Position Submenu */}
            <DropdownMenu.Sub onOpenChange={setCameraSubOpen}>
              <DropdownMenu.SubTrigger
                style={{
                  ...itemStyles,
                  ...itemPaddingStyles,
                  backgroundColor:
                    cameraSubOpen || hoveredItem === "camera"
                      ? "#404040"
                      : "transparent",
                }}
                onMouseEnter={() => setHoveredItem("camera")}
                onMouseLeave={() => setHoveredItem(null)}
                onTouchStart={() => setHoveredItem("camera")}
              >
                <span
                  style={{ flex: 1, display: "flex", alignItems: "center" }}
                >
                  Camera Position
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 6,
                    marginLeft: "auto",
                  }}
                >
                  <span style={{ opacity: 0.55, fontSize: 13 }}>
                    {getDisplayName(cameraPreset)}
                  </span>
                  <ChevronRightIcon isOpen={cameraSubOpen} />
                </div>
              </DropdownMenu.SubTrigger>

              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  style={{ ...contentStyles, marginLeft: -2, minWidth: 200 }}
                  collisionPadding={10}
                  avoidCollisions={true}
                >
                  {/* Built-in camera presets */}
                  {cameraOptions.map((option) => (
                    <DropdownMenu.Item
                      key={option}
                      style={{
                        ...itemStyles,
                        backgroundColor:
                          hoveredItem === option ? "#404040" : "transparent",
                      }}
                      onSelect={(e) => e.preventDefault()}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        onCameraPresetSelect(option)
                      }}
                      onMouseEnter={() => setHoveredItem(option)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onTouchStart={() => setHoveredItem(option)}
                    >
                      <span style={iconContainerStyles}>
                        {cameraPreset === option && <DotIcon />}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          flex: 1,
                        }}
                      >
                        {getDisplayName(option)}
                      </span>
                      {/* Delete button for custom views */}
                      {option.startsWith("custom:") && (
                        <span
                          style={{
                            opacity: 0.6,
                            cursor: "pointer",
                            padding: "2px 4px",
                            marginLeft: 8,
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteCustomView(option.slice(7))
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <TrashIcon />
                        </span>
                      )}
                    </DropdownMenu.Item>
                  ))}

                  <DropdownMenu.Separator style={separatorStyles} />

                  {/* Save Custom View with Name */}
                  {isNamingView ? (
                    <div
                      style={{
                        ...itemStyles,
                        padding: "6px 8px",
                      }}
                    >
                      <input
                        ref={inputRef}
                        type="text"
                        value={newViewName}
                        onChange={(e) => setNewViewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveNewView()
                          } else if (e.key === "Escape") {
                            setIsNamingView(false)
                            setNewViewName("")
                          }
                          e.stopPropagation()
                        }}
                        placeholder="Enter view name..."
                        style={{
                          background: "#333",
                          border: "1px solid #555",
                          borderRadius: 4,
                          padding: "4px 8px",
                          color: "#fff",
                          fontSize: 13,
                          width: "100%",
                          outline: "none",
                        }}
                      />
                    </div>
                  ) : (
                    <DropdownMenu.Item
                      style={{
                        ...itemStyles,
                        backgroundColor:
                          hoveredItem === "save-custom"
                            ? "#404040"
                            : "transparent",
                      }}
                      onSelect={(e) => {
                        e.preventDefault()
                        setIsNamingView(true)
                      }}
                      onMouseEnter={() => setHoveredItem("save-custom")}
                      onMouseLeave={() => setHoveredItem(null)}
                      onTouchStart={() => setHoveredItem("save-custom")}
                    >
                      <span style={iconContainerStyles}>
                        <SaveIcon />
                      </span>
                      <span style={{ display: "flex", alignItems: "center" }}>
                        Save View with Name...
                      </span>
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>

            {/* Auto Rotate */}
            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "autorotate" ? "#404040" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                onAutoRotateToggle()
              }}
              onMouseEnter={() => setHoveredItem("autorotate")}
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() => setHoveredItem("autorotate")}
            >
              <span style={iconContainerStyles}>
                {autoRotate && <CheckIcon />}
              </span>
              <span style={{ display: "flex", alignItems: "center" }}>
                Auto rotate
              </span>
            </DropdownMenu.Item>

            {/* Orthographic Camera Toggle */}
            <DropdownMenu.Item
              style={{
                ...itemStyles,
                backgroundColor:
                  hoveredItem === "cameratype" ? "#404040" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                setCameraType(
                  cameraType === "perspective" ? "orthographic" : "perspective",
                )
              }}
              onMouseEnter={() => setHoveredItem("cameratype")}
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() => setHoveredItem("cameratype")}
            >
              <span style={iconContainerStyles}>
                {cameraType === "orthographic" && <CheckIcon />}
              </span>
              <span style={{ display: "flex", alignItems: "center" }}>
                Orthographic Camera
              </span>
            </DropdownMenu.Item>

            {/* Appearance Menu */}
            <AppearanceMenu />

            <DropdownMenu.Separator style={separatorStyles} />

            {/* Download GLTF */}
            <DropdownMenu.Item
              style={{
                ...itemStyles,
                ...itemPaddingStyles,
                backgroundColor:
                  hoveredItem === "download" ? "#404040" : "transparent",
              }}
              onSelect={onDownloadGltf}
              onMouseEnter={() => setHoveredItem("download")}
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() => setHoveredItem("download")}
            >
              <span style={{ display: "flex", alignItems: "center" }}>
                Download GLTF
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Separator style={separatorStyles} />

            {/* Engine Switch */}
            <DropdownMenu.Item
              style={{
                ...itemStyles,
                ...itemPaddingStyles,
                backgroundColor:
                  hoveredItem === "engine" ? "#404040" : "transparent",
              }}
              onSelect={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.preventDefault()
                onEngineSwitch(engine === "jscad" ? "manifold" : "jscad")
              }}
              onMouseEnter={() => setHoveredItem("engine")}
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() => setHoveredItem("engine")}
            >
              <span style={{ flex: 1, display: "flex", alignItems: "center" }}>
                Switch to {engine === "jscad" ? "Manifold" : "JSCAD"} Engine
              </span>
              <div
                style={{
                  ...badgeStyles,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {engine === "jscad" ? "experimental" : "default"}
              </div>
            </DropdownMenu.Item>

            <DropdownMenu.Separator style={separatorStyles} />

            {/* Keyboard Shortcuts */}
            <DropdownMenu.Item
              style={{
                ...itemStyles,
                ...itemPaddingStyles,
                backgroundColor:
                  hoveredItem === "shortcuts" ? "#404040" : "transparent",
              }}
              onSelect={onOpenKeyboardShortcuts}
              onMouseEnter={() => setHoveredItem("shortcuts")}
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() => setHoveredItem("shortcuts")}
            >
              <span style={{ flex: 1, display: "flex", alignItems: "center" }}>
                Keyboard Shortcuts
              </span>
              <div
                style={{
                  ...badgeStyles,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                Shift+?
              </div>
            </DropdownMenu.Item>

            <DropdownMenu.Separator style={separatorStyles} />

            {/* Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 0,
                paddingLeft: 32,
                paddingTop: 4,
                paddingBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  opacity: 0.35,
                  fontWeight: 400,
                  color: "#a1a1aa",
                  letterSpacing: "0.2px",
                }}
              >
                @tscircuit/3d-viewer@{packageJson.version}
              </span>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}
