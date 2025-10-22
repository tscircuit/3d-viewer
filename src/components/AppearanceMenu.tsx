import { SubMenu, MenuItem } from "@szhsin/react-menu"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"

export const AppearanceMenu = () => {
  const { visibility, toggleLayer } = useLayerVisibility()

  return (
    <SubMenu label="Appearance">
      <MenuItem onClick={() => toggleLayer("boardBody")}>
        <span className="menu-checkmark">
          {visibility.boardBody ? "✔" : ""}
        </span>
        Board Body
      </MenuItem>

      <MenuItem onClick={() => toggleLayer("topCopper")}>
        <span className="menu-checkmark">
          {visibility.topCopper ? "✔" : ""}
        </span>
        Top Copper
      </MenuItem>

      <MenuItem onClick={() => toggleLayer("bottomCopper")}>
        <span className="menu-checkmark">
          {visibility.bottomCopper ? "✔" : ""}
        </span>
        Bottom Copper
      </MenuItem>

      <MenuItem onClick={() => toggleLayer("topSilkscreen")}>
        <span className="menu-checkmark">
          {visibility.topSilkscreen ? "✔" : ""}
        </span>
        Top Silkscreen
      </MenuItem>

      <MenuItem onClick={() => toggleLayer("bottomSilkscreen")}>
        <span className="menu-checkmark">
          {visibility.bottomSilkscreen ? "✔" : ""}
        </span>
        Bottom Silkscreen
      </MenuItem>

      <MenuItem onClick={() => toggleLayer("smtModels")}>
        <span className="menu-checkmark">
          {visibility.smtModels ? "✔" : ""}
        </span>
        CAD Models
      </MenuItem>
    </SubMenu>
  )
}
