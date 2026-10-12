import { useLayoutEffect } from "react"
import type * as THREE from "three"
import { useThree } from "../react-three/ThreeContext"

/** One parent transform includes native board/copper, all CAD and CAD cables. */
export function ScenePresentation({ matrix }: { matrix?: THREE.Matrix4 }) {
  const { rootObject } = useThree()
  useLayoutEffect(() => {
    if (matrix) {
      matrix.decompose(
        rootObject.position,
        rootObject.quaternion,
        rootObject.scale,
      )
    } else {
      rootObject.position.set(0, 0, 0)
      rootObject.quaternion.identity()
      rootObject.scale.set(1, 1, 1)
    }
    rootObject.updateMatrixWorld(true)
    return () => {
      rootObject.position.set(0, 0, 0)
      rootObject.quaternion.identity()
      rootObject.scale.set(1, 1, 1)
      rootObject.updateMatrixWorld(true)
    }
  }, [matrix, rootObject])
  return null
}
