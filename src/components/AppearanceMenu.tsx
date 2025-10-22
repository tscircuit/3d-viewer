import { useState, useRef, useEffect } from "react"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import type React from "react"

const menuItemStyle: React.CSSProperties = {
  padding: "8px 12px",
  margin: "0 4px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#e4e4e7",
  fontWeight: 400,
  fontSize: 14,
  borderRadius: 4,
  transition: "background 0.15s ease",
}

const checkmarkStyle: React.CSSProperties = {
  width: 16,
  textAlign: "center",
  fontSize: 12,
}

const handleMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"
}

const handleMouseOut = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.background = "transparent"
}

export const AppearanceMenu = () => {
  const { visibility, toggleLayer } = useLayerVisibility()
  const [showSubmenu, setShowSubmenu] = useState(false)
  const submenuRef = useRef<HTMLDivElement>(null)
  const menuItemRef = useRef<HTMLDivElement>(null)
  const [submenuStyle, setSubmenuStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (showSubmenu && submenuRef.current && menuItemRef.current) {
      const adjustSubmenuPosition = () => {
        if (!submenuRef.current || !menuItemRef.current) return

        const submenuRect = submenuRef.current.getBoundingClientRect()
        const triggerRect = menuItemRef.current.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const SPACING = -6
        const PADDING = 20

        let style: React.CSSProperties = {
          position: 'absolute',
          minWidth: 200,
          background: '#2c313a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
          zIndex: 1001,
          padding: '4px 0',
        }

        // Determine horizontal placement
        const spaceOnRight = viewportWidth - triggerRect.right
        const spaceOnLeft = triggerRect.left
        const submenuWidthWithSpacing = submenuRect.width + Math.abs(SPACING)
        
        if (spaceOnRight >= submenuWidthWithSpacing + PADDING) {
          // Enough space on right - position to the right
          style.left = '100%'
          style.marginLeft = SPACING
        } else if (spaceOnLeft >= submenuWidthWithSpacing + PADDING) {
          // Not enough space on right, but enough on left - position to the left
          style.right = '100%'
          style.marginRight = SPACING
        } else {
          // Not enough space on either side - choose side with more space
          if (spaceOnRight > spaceOnLeft) {
            style.left = '100%'
            style.marginLeft = SPACING
          } else {
            style.right = '100%'
            style.marginRight = SPACING
          }
        }

        // Vertical placement - check if submenu fits below
        const spaceBelow = viewportHeight - triggerRect.top - PADDING
        const spaceAbove = triggerRect.bottom - PADDING
        
        if (submenuRect.height <= spaceBelow) {
          // Fits below - align with Appearance item
          style.top = 0
        } else if (submenuRect.height <= spaceAbove) {
          // Doesn't fit below but fits above - flip up
          style.bottom = 0
        } else {
          // Doesn't fit either way - choose side with more space
          if (spaceBelow > spaceAbove) {
            // More space below - align to top and let it extend
            style.top = 0
            style.maxHeight = spaceBelow - PADDING
            style.overflowY = 'auto'
          } else {
            // More space above - align to bottom
            style.bottom = 0
            style.maxHeight = spaceAbove - PADDING
            style.overflowY = 'auto'
          }
        }

        setSubmenuStyle(style)
      }

      requestAnimationFrame(adjustSubmenuPosition)
    }
  }, [showSubmenu])

  return (
    <>
      <div
        style={{
          height: 1,
          background: "rgba(255, 255, 255, 0.1)",
          margin: "4px 8px",
        }}
      />
      <div
        ref={menuItemRef}
        style={{
          ...menuItemStyle,
          justifyContent: "space-between",
          position: "relative",
        }}
        onMouseEnter={() => setShowSubmenu(true)}
        onMouseLeave={() => setShowSubmenu(false)}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={checkmarkStyle}></span>
          Appearance
        </div>
        <span style={{ fontSize: 16, opacity: 0.7, transform: "translateY(1px)" }}>›</span>

        {showSubmenu && (
          <div
            ref={submenuRef}
            style={submenuStyle}
            onMouseEnter={() => setShowSubmenu(true)}
            onMouseLeave={() => setShowSubmenu(false)}
          >
            {[
              { key: "boardBody", label: "Board Body" },
              { key: "topCopper", label: "Top Copper" },
              { key: "bottomCopper", label: "Bottom Copper" },
              { key: "topSilkscreen", label: "Top Silkscreen" },
              { key: "bottomSilkscreen", label: "Bottom Silkscreen" },
              { key: "smtModels", label: "CAD Models" },
            ].map(({ key, label }) => (
              <div
                key={key}
                style={menuItemStyle}
                onClick={() => toggleLayer(key as any)}
                onMouseOver={handleMouseOver}
                onMouseOut={handleMouseOut}
              >
                <span style={checkmarkStyle}>
                  {visibility[key as keyof typeof visibility] ? "✓" : ""}
                </span>
                {label}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
