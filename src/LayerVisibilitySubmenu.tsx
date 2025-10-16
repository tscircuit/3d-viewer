import React, { forwardRef } from "react"

export type LayerVisibility = {
  board: boolean
  fCu: boolean
  bCu: boolean
  fSilkscreen: boolean
  bSilkscreen: boolean
  cadComponents: boolean
}

interface LayerVisibilitySubmenuProps {
  layerVisibility: LayerVisibility
  presentLayers: Partial<LayerVisibility>
  onToggleLayer: (layer: keyof LayerVisibility) => void
  onShowAllLayers: () => void
  position: { x: number; y: number }
}

export const LayerVisibilitySubmenu = forwardRef<
  HTMLDivElement,
  LayerVisibilitySubmenuProps
>(
  (
    {
      layerVisibility,
      presentLayers,
      onToggleLayer,
      onShowAllLayers,
      position,
    },
    ref,
  ) => {
    const SUBMENU_WIDTH = 200
    const SUBMENU_HEIGHT = 300
    const HORIZONTAL_OFFSET = 220
    const MARGIN = 20

    // Calculate position to keep submenu within viewport bounds
    const left =
      position.x + HORIZONTAL_OFFSET + SUBMENU_WIDTH > window.innerWidth
        ? position.x - SUBMENU_WIDTH - MARGIN
        : position.x + HORIZONTAL_OFFSET

    const top =
      position.y + SUBMENU_HEIGHT > window.innerHeight
        ? window.innerHeight - SUBMENU_HEIGHT - MARGIN
        : position.y

    return (
      <div
        ref={ref}
        style={{
          position: "fixed",
          top,
          left,
          background: "#23272f",
          color: "#f5f6fa",
          borderRadius: 6,
          boxShadow: "0 6px 24px 0 rgba(0,0,0,0.18)",
          zIndex: 1001,
          minWidth: 180,
          border: "1px solid #353945",
          padding: 0,
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        <div
          style={{
            padding: "12px 18px 8px 18px",
            fontSize: 12,
            opacity: 0.7,
            fontWeight: 500,
            color: "#c0c0c0",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            marginBottom: "4px",
          }}
        >
          Layer Visibility
        </div>
        <div
          style={{
            padding: "8px 18px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#4ade80",
            fontWeight: 500,
            fontSize: 14,
            borderRadius: 6,
            transition: "background 0.1s",
          }}
          onClick={onShowAllLayers}
          onMouseOver={(e) => (e.currentTarget.style.background = "#2d313a")}
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Show All Layers
        </div>
        {Object.entries(layerVisibility)
          .filter(([layer]) => presentLayers[layer as keyof LayerVisibility])
          .map(([layer, visible]) => (
            <div
              key={layer}
              style={{
                padding: "8px 18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "#f5f6fa",
                fontWeight: 400,
                fontSize: 14,
                borderRadius: 6,
                transition: "background 0.1s",
              }}
              onClick={() => onToggleLayer(layer as keyof LayerVisibility)}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#2d313a")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span style={{ marginRight: 8 }}>{visible ? "✔" : ""}</span>
              {layer === "board"
                ? "Board Body"
                : layer === "cadComponents"
                  ? "CAD Components"
                  : layer === "fCu"
                    ? "F.Cu"
                    : layer === "bCu"
                      ? "B.Cu"
                      : layer === "fSilkscreen"
                        ? "F.Silkscreen"
                        : layer === "bSilkscreen"
                          ? "B.Silkscreen"
                          : layer.charAt(0).toUpperCase() + layer.slice(1)}
            </div>
          ))}
      </div>
    )
  },
)
