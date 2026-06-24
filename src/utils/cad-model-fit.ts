import * as THREE from "three"

export type CadModelFitMode = "contain_within_bounds" | "fill_bounds"
export type CadModelSize = [number, number, number]

function getObjectBoundsRelativeToParent(
  object: THREE.Object3D,
): THREE.Box3 | null {
  const bounds = new THREE.Box3()
  let hasBounds = false

  object.updateWorldMatrix(true, false)
  const parentInverseMatrix = object.parent
    ? object.parent.matrixWorld.clone().invert()
    : new THREE.Matrix4()

  object.traverse((node) => {
    node.updateWorldMatrix(true, false)
    if (node instanceof THREE.Mesh && node.geometry) {
      if (!node.geometry.boundingBox) {
        node.geometry.computeBoundingBox()
      }

      if (node.geometry.boundingBox) {
        const transformedBounds = node.geometry.boundingBox.clone()
        transformedBounds.applyMatrix4(node.matrixWorld)
        transformedBounds.applyMatrix4(parentInverseMatrix)

        if (!hasBounds) {
          bounds.copy(transformedBounds)
          hasBounds = true
        } else {
          bounds.union(transformedBounds)
        }
      }
    }
  })

  return hasBounds ? bounds : null
}

function getLocalBoundsSize(object: THREE.Object3D): THREE.Vector3 {
  const bounds = getObjectBoundsRelativeToParent(object)
  if (!bounds) {
    return new THREE.Vector3()
  }

  return bounds.getSize(new THREE.Vector3())
}

export function getCadModelFitScale(
  object: THREE.Object3D,
  targetSize?: CadModelSize,
  fitMode: CadModelFitMode = "contain_within_bounds",
): [number, number, number] {
  if (!targetSize) {
    return [1, 1, 1]
  }

  const size = getLocalBoundsSize(object)

  const safeScale: [number, number, number] = [
    size.x > 0 ? targetSize[0] / size.x : 1,
    size.y > 0 ? targetSize[1] / size.y : 1,
    size.z > 0 ? targetSize[2] / size.z : 1,
  ]

  if (fitMode === "fill_bounds") {
    return safeScale
  }

  const uniformScale = Math.min(...safeScale)
  return [uniformScale, uniformScale, uniformScale]
}
