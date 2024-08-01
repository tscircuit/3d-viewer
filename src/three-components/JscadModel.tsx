import type { JscadOperation } from "jscad-planner"
import { executeJscadOperations } from "jscad-planner"
import jscad from "@jscad/modeling"

export const JscadModel = ({ jscadPlan }: { jscadPlan: JscadOperation }) => {
  const jscadObject = executeJscadOperations(jscad as any, jscadPlan)

  // Convert jscad object to three geometry

  return null
}
