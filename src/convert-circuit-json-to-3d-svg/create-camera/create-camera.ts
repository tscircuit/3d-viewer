import * as THREE from "three"

export const createCamera = (options: {
  perspective?:
    | "angled"
    | "top"
    | "front"
    | "side"
    | "isometric-angled"
    | "isometric-top"
    | "isometric-front"
    | "isometric-side"
  camera?: {
    position: {
      x: number
      y: number
      z: number
    }
    lookAt?: {
      x: number
      y: number
      z: number
    }
  }
  screenSize: {
    width: number
    height: number
  }
  zoom?: number
}): THREE.Camera => {
  if (options.perspective?.includes("isometric")) {
    const camera = new THREE.OrthographicCamera()
    // Set camera properties
    const aspect = options.screenSize.width / options.screenSize.height
    const frustumSize = 100
    const halfFrustumSize = frustumSize / 2 / (options.zoom ?? 1)

    // Set camera properties
    camera.left = -halfFrustumSize * aspect
    camera.right = halfFrustumSize * aspect
    camera.top = halfFrustumSize
    camera.bottom = -halfFrustumSize
    camera.near = -1000
    camera.far = 1000

    const position = options.camera?.position ?? { x: 0, y: 0, z: 100 }
    camera.position.set(position.x, position.y, position.z)

    const lookAt = options.camera?.lookAt ?? { x: 0, y: 0, z: 0 }
    camera.lookAt(new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z))
    // Set camera up vector
    camera.up.set(0, 0, 1)
    camera.updateProjectionMatrix()

    return camera
  }

  const camera = new THREE.PerspectiveCamera()

  const position = options.camera?.position ?? { x: 10, y: 10, z: 10 }
  camera.position.set(position.x, position.y, position.z)

  const lookAt = options.camera?.lookAt ?? { x: 0, y: 0, z: 0 }
  camera.lookAt(new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z))
  camera.up.set(0, 0, 1)

  camera.updateProjectionMatrix()

  return camera
}
