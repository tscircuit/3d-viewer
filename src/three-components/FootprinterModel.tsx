import { Footprinter3d } from "jscad-electronics"
import { createJSCADRenderer } from "jscad-fiber"
import { jscadPlanner } from "jscad-planner"
import { useMemo } from "react"
import { JscadModel } from "./JscadModel"

const { createJSCADRoot } = createJSCADRenderer(jscadPlanner as any)

export const FootprinterModel = ({
  positionOffset,
  footprint,
}: { positionOffset: any; footprint: string }) => {
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
          rotationOffset={[Math.PI / 2, 0, 0]}
          jscadPlan={plan}
        />
      ))}
    </>
  )
}
