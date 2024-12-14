import { Footprinter3d } from "jscad-electronics"
import { createJSCADRenderer } from "jscad-fiber"
import { jscadPlanner } from "jscad-planner"
import { useMemo } from "react"
import { JscadModel } from "./JscadModel"

const { createJSCADRoot } = createJSCADRenderer(jscadPlanner as any)

export const FootprinterModel = ({
  positionOffset,
  footprint,
  rotationOffset,
  componentId,
  name,
  onHover,
  isHovered,
}: {
  positionOffset: any
  footprint: string
  rotationOffset?: [number, number, number]
  componentId: string
  name: string
  onHover: (id: string | null) => void
  isHovered: boolean
}) => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
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
          componentId={componentId}
          name={name}
          onHover={onHover}
          isHovered={isHovered}
        />
      ))}
    </>
  )
}
