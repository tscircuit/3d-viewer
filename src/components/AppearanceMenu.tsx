import { useState } from "react"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import type React from "react"

const menuItemStyle: React.CSSProperties = {
  padding: "8px 18px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#f5f6fa",
  fontWeight: 400,
  fontSize: 14,
  transition: "background 0.1s",
}

const checkmarkStyle: React.CSSProperties = {
  width: 20,
}

const handleMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.background = "#2d313a"
}

const handleMouseOut = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.background = "transparent"
}

export const AppearanceMenu = () => {
  const { visibility, toggleLayer } = useLayerVisibility()
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      <div
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          margin: "8px 0",
        }}
      />
      <div
        style={{
          padding: "8px 18px",
          fontSize: 13,
          color: "#a0a0a0",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "background 0.1s",
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
      >
        <span>Appearance</span>
        <span style={{ fontSize: 10 }}>{isExpanded ? "▼" : "▶"}</span>
      </div>
      {isExpanded && (
        <>
          <div
            style={menuItemStyle}
            onClick={() => toggleLayer("boardBody")}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          >
            <span style={checkmarkStyle}>
              {visibility.boardBody ? "✔" : ""}
            </span>
            Board Body
          </div>
          <div
            style={menuItemStyle}
            onClick={() => toggleLayer("topCopper")}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          >
            <span style={checkmarkStyle}>
              {visibility.topCopper ? "✔" : ""}
            </span>
            F.Cu
          </div>
          <div
            style={menuItemStyle}
            onClick={() => toggleLayer("bottomCopper")}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          >
            <span style={checkmarkStyle}>
              {visibility.bottomCopper ? "✔" : ""}
            </span>
            B.Cu
          </div>
          <div
            style={menuItemStyle}
            onClick={() => toggleLayer("topSilkscreen")}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          >
            <span style={checkmarkStyle}>
              {visibility.topSilkscreen ? "✔" : ""}
            </span>
            F.Silkscreen
          </div>
          <div
            style={menuItemStyle}
            onClick={() => toggleLayer("bottomSilkscreen")}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          >
            <span style={checkmarkStyle}>
              {visibility.bottomSilkscreen ? "✔" : ""}
            </span>
            B.Silkscreen
          </div>
          <div
            style={menuItemStyle}
            onClick={() => toggleLayer("smtModels")}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          >
            <span style={checkmarkStyle}>
              {visibility.smtModels ? "✔" : ""}
            </span>
            SMT Models
          </div>
        </>
      )}
    </>
  )
}
