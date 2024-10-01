import type { JscadOperation } from "jscad-planner"
import { executeJscadOperations } from "jscad-planner"
import jscad from "@jscad/modeling"
import { convertCSGToThreeGeom } from "jscad-fiber"
import * as THREE from "three"
import { useMemo } from "react"

export const JscadModel = ({
  jscadPlan,
  positionOffset,
  rotationOffset,
}: {
  jscadPlan: JscadOperation
  positionOffset?: [number, number, number]
  rotationOffset?: [number, number, number]
}) => {
  const { threeGeom, material } = useMemo(() => {
    const jscadObject = executeJscadOperations(jscad as any, jscadPlan)

    const threeGeom = convertCSGToThreeGeom(jscadObject)

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide, // Ensure both sides are visible
    })
    return { threeGeom, material }
  }, [jscadPlan])

  if (!threeGeom) return null

  return (
    <mesh
      geometry={threeGeom}
      material={material}
      position={positionOffset}
      rotation={rotationOffset}
    />
  )
}
