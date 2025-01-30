import { Footprinter3d } from "jscad-electronics"
import { createJSCADRenderer } from "jscad-fiber"
import { jscadPlanner } from "jscad-planner"
import { useMemo } from "react"
import { JscadModel, type tooltip } from "./JscadModel"

export type * as tooltip from "./JscadModel"

const { createJSCADRoot } = createJSCADRenderer(jscadPlanner as any)

export function FootprinterModel({
  positionOffset,
  footprint,
  rotationOffset,
  onHover,
  onUnhover,
  isHovered,
}: tooltip.HoverProps & {
  positionOffset: any
  footprint: string
  rotationOffset?: [number, number, number]
}) {
  const jscadOperations = useMemo(() => {
    if (!footprint) return null
    const jscadOperations: any[] = []
    const root = createJSCADRoot(jscadOperations)
    root.render(<Footprinter3d footprint={footprint} />)
    return jscadOperations
  }, [footprint])

  if (!jscadOperations) return null

  return (
    <>
      {jscadOperations.map((operation, index) => (
        <JscadModel
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          key={index}
          positionOffset={positionOffset}
          rotationOffset={rotationOffset}
          jscadPlan={operation}
          onHover={onHover}
          onUnhover={onUnhover}
          isHovered={isHovered}
        />
      ))}
    </>
  )
}
