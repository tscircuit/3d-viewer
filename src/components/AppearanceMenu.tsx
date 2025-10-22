import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"

export const AppearanceMenu = () => {
  const { visibility, toggleLayer } = useLayerVisibility()

  return (
    <ContextMenuPrimitive.Sub>
      <ContextMenuPrimitive.SubTrigger className="context-menu-item context-menu-submenu-trigger">
        <span>Appearance</span>
        <span className="context-menu-arrow">›</span>
      </ContextMenuPrimitive.SubTrigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.SubContent className="context-menu-content context-menu-subcontent">
          <ContextMenuPrimitive.CheckboxItem
            className="context-menu-item"
            checked={visibility.boardBody}
            onCheckedChange={() => toggleLayer("boardBody")}
          >
            <span className="context-menu-checkmark">
              {visibility.boardBody ? "✔" : ""}
            </span>
            Board Body
          </ContextMenuPrimitive.CheckboxItem>

          <ContextMenuPrimitive.CheckboxItem
            className="context-menu-item"
            checked={visibility.topCopper}
            onCheckedChange={() => toggleLayer("topCopper")}
          >
            <span className="context-menu-checkmark">
              {visibility.topCopper ? "✔" : ""}
            </span>
            Top Copper
          </ContextMenuPrimitive.CheckboxItem>

          <ContextMenuPrimitive.CheckboxItem
            className="context-menu-item"
            checked={visibility.bottomCopper}
            onCheckedChange={() => toggleLayer("bottomCopper")}
          >
            <span className="context-menu-checkmark">
              {visibility.bottomCopper ? "✔" : ""}
            </span>
            Bottom Copper
          </ContextMenuPrimitive.CheckboxItem>

          <ContextMenuPrimitive.CheckboxItem
            className="context-menu-item"
            checked={visibility.topSilkscreen}
            onCheckedChange={() => toggleLayer("topSilkscreen")}
          >
            <span className="context-menu-checkmark">
              {visibility.topSilkscreen ? "✔" : ""}
            </span>
            Top Silkscreen
          </ContextMenuPrimitive.CheckboxItem>

          <ContextMenuPrimitive.CheckboxItem
            className="context-menu-item"
            checked={visibility.bottomSilkscreen}
            onCheckedChange={() => toggleLayer("bottomSilkscreen")}
          >
            <span className="context-menu-checkmark">
              {visibility.bottomSilkscreen ? "✔" : ""}
            </span>
            Bottom Silkscreen
          </ContextMenuPrimitive.CheckboxItem>

          <ContextMenuPrimitive.CheckboxItem
            className="context-menu-item"
            checked={visibility.smtModels}
            onCheckedChange={() => toggleLayer("smtModels")}
          >
            <span className="context-menu-checkmark">
              {visibility.smtModels ? "✔" : ""}
            </span>
            CAD Models
          </ContextMenuPrimitive.CheckboxItem>
        </ContextMenuPrimitive.SubContent>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Sub>
  )
}
