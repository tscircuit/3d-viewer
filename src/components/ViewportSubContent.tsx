import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { useLayoutEffect, useState, type ComponentProps } from "react"

/** Let a submenu overlap its parent when neither side has room for it. */
export const ViewportSubContent = (
  props: ComponentProps<typeof DropdownMenu.SubContent>,
) => {
  const [content, setContent] = useState<HTMLDivElement | null>(null)
  const [overlapWidth, setOverlapWidth] = useState<number>()

  useLayoutEffect(() => {
    if (!content) return
    const trigger = document.getElementById(
      content.getAttribute("aria-labelledby") ?? "",
    )
    if (!trigger) return
    let naturalWidth = 0
    const update = () => {
      naturalWidth = Math.max(naturalWidth, content.offsetWidth)
      if (!naturalWidth) return
      const bounds = trigger.getBoundingClientRect()
      const availableWidth = Math.max(
        bounds.left - 10,
        document.documentElement.clientWidth - bounds.right - 10,
      )
      setOverlapWidth(availableWidth < naturalWidth ? bounds.width : undefined)
    }
    const observer = new ResizeObserver(update)
    observer.observe(content)
    observer.observe(trigger)
    update()
    window.addEventListener("resize", update)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [content])

  return (
    <DropdownMenu.SubContent
      {...props}
      ref={setContent}
      sideOffset={overlapWidth === undefined ? props.sideOffset : -overlapWidth}
      style={{
        ...props.style,
        ...(overlapWidth === undefined
          ? {}
          : { minWidth: Math.min(160, overlapWidth), maxWidth: overlapWidth }),
      }}
    />
  )
}
