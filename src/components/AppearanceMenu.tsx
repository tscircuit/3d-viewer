import { SubMenu, MenuItem } from "@szhsin/react-menu"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"

const checkmarkStyle = {
  width: "20px",
  display: "inline-flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  marginRight: "4px",
}

export const AppearanceMenu = () => {
  const { visibility, toggleLayer } = useLayerVisibility()

  return (
    <SubMenu label="Appearance">
      <MenuItem onClick={() => toggleLayer("boardBody")}>
        <span style={checkmarkStyle}>{visibility.boardBody ? "✔" : ""}</span>
        Board Body
      </MenuItem>

      <MenuItem onClick={() => toggleLayer("topCopper")}>
        <span style={checkmarkStyle}>{visibility.topCopper ? "✔" : ""}</span>
        Top Copper
      </MenuItem>

      <MenuItem onClick={() => toggleLayer("bottomCopper")}>
        <span style={checkmarkStyle}>{visibility.bottomCopper ? "✔" : ""}</span>
        Bottom Copper
      </MenuItem>

      <MenuItem onClick={() => toggleLayer("topSilkscreen")}>
        <span style={checkmarkStyle}>
          {visibility.topSilkscreen ? "✔" : ""}
        </span>
        Top Silkscreen
      </MenuItem>

      <MenuItem onClick={() => toggleLayer("bottomSilkscreen")}>
        <span style={checkmarkStyle}>
          {visibility.bottomSilkscreen ? "✔" : ""}
        </span>
        Bottom Silkscreen
      </MenuItem>

      <MenuItem onClick={() => toggleLayer("smtModels")}>
        <span style={checkmarkStyle}>{visibility.smtModels ? "✔" : ""}</span>
        CAD Models
      </MenuItem>
    </SubMenu>
  )
}
