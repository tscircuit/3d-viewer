import { useEffect } from "react"
import { useCameraController } from "../contexts/CameraControllerContext"
import { useThree } from "../react-three/ThreeContext"
import {
  createReferenceObject,
  disposeReferenceObject,
} from "../reference-objects/create-reference-object"
import { fitCameraToBounds } from "../reference-objects/fit-camera-to-bounds"
import {
  type BoardCenter,
  type BoardDimensions,
  type Bounds3d,
  getReferenceObjectPosition,
  type ReferenceObjectType,
} from "../reference-objects/reference-object"

interface ReferenceObjectProps {
  type: ReferenceObjectType
  boardDimensions?: BoardDimensions
  boardCenter?: BoardCenter
}

export const ReferenceObject = ({
  type,
  boardDimensions,
  boardCenter,
}: ReferenceObjectProps) => {
  const { scene } = useThree()
  useEffect(() => {
    const object = createReferenceObject(type)
    const position = getReferenceObjectPosition(
      type,
      boardDimensions,
      boardCenter,
    )
    object.position.set(position.x, position.y, position.z)
    scene.add(object)
    return () => {
      scene.remove(object)
      disposeReferenceObject(object)
    }
  }, [scene, type, boardDimensions, boardCenter])

  return null
}

export const FitCameraToComparison = ({ bounds }: { bounds: Bounds3d }) => {
  const { camera } = useThree()
  const { controlsRef } = useCameraController()

  useEffect(() => {
    fitCameraToBounds(camera, controlsRef.current, bounds)
  }, [bounds, camera, controlsRef])

  return null
}
