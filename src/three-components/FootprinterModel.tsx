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
  const jscadPlan = useMemo(() => {
    if (!footprint) return null
    const jscadPlan: any[] = []
    const root = createJSCADRoot(jscadPlan)
    root.render(<Footprinter3d footprint={footprint} />)
    return jscadPlan
  }, [footprint])

  if (!jscadPlan) return null

  return (
    <>
      {jscadPlan.map((plan, index) => (
        <JscadModel
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          key={index}
          positionOffset={positionOffset}
          rotationOffset={rotationOffset}
          jscadPlan={plan}
          componentId={componentId}
          name={name}
          onHover={onHover}
          isHovered={isHovered}
        />
      ))}
    </>
  )
}
