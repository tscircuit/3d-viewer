import React, { forwardRef } from "react"

export type LayerVisibility = {
  board: boolean
  platedHoles: boolean
  smtPads: boolean
  vias: boolean
  copperPours: boolean
  topTrace: boolean
  bottomTrace: boolean
  topSilkscreen: boolean
  bottomSilkscreen: boolean
  cadComponents: boolean
}

interface LayerVisibilitySubmenuProps {
  layerVisibility: LayerVisibility
  presentLayers: Partial<LayerVisibility>
  onToggleLayer: (layer: keyof LayerVisibility) => void
  onShowAllLayers: () => void
  position: { x: number; y: number }
}

export const LayerVisibilitySubmenu = forwardRef<HTMLDivElement, LayerVisibilitySubmenuProps>(({
  layerVisibility,
  presentLayers,
  onToggleLayer,
  onShowAllLayers,
  position,
}, ref) => {
  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: position.y,
        left: position.x + 220,
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
          onMouseOver={(e) => (e.currentTarget.style.background = "#2d313a")}
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span style={{ marginRight: 8 }}>{visible ? "✔" : ""}</span>
          {layer === "cadComponents" ? "CAD Components" :
           layer === "platedHoles" ? "Plated Holes" :
           layer === "smtPads" ? "SMT Pads" :
           layer === "copperPours" ? "Copper Pours" :
           layer === "topTrace" ? "Top Traces" :
           layer === "bottomTrace" ? "Bottom Traces" :
           layer === "topSilkscreen" ? "Top Silkscreen" :
           layer === "bottomSilkscreen" ? "Bottom Silkscreen" :
           layer.charAt(0).toUpperCase() + layer.slice(1)}
        </div>
      ))}
    </div>
  )
})