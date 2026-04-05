import { useEffect, useMemo } from "react"
import { useThree } from "src/react-three/ThreeContext"
import {
  type CadModelFitMode,
  type CadModelSize,
  getCadModelFitScale,
} from "src/utils/cad-model-fit"
import * as THREE from "three"

interface UseCadModelTransformGraphOptions {
  model: THREE.Object3D | null
  position?: [number, number, number]
  rotation?: [number, number, number]
  modelOffset?: [number, number, number]
  modelRotation?: [number, number, number]
  sourceCoordinateTransform?: THREE.Matrix4
  modelSize?: CadModelSize
  modelFitMode?: CadModelFitMode
  scale?: number
}

export const useCadModelTransformGraph = ({
  model,
  position,
  rotation,
  modelOffset = [0, 0, 0],
  modelRotation = [0, 0, 0],
  sourceCoordinateTransform,
  modelSize,
  modelFitMode = "contain_within_bounds",
  scale,
}: UseCadModelTransformGraphOptions) => {
  const { rootObject } = useThree()
  const boardTransformGroup = useMemo(() => new THREE.Group(), [])
  const fitTransformGroup = useMemo(() => new THREE.Group(), [])
  const modelTransformGroup = useMemo(() => new THREE.Group(), [])
  const loaderTransformGroup = useMemo(() => new THREE.Group(), [])

  useEffect(() => {
    boardTransformGroup.add(fitTransformGroup)
    return () => {
      boardTransformGroup.remove(fitTransformGroup)
    }
  }, [boardTransformGroup, fitTransformGroup])

  useEffect(() => {
    fitTransformGroup.add(modelTransformGroup)
    return () => {
      fitTransformGroup.remove(modelTransformGroup)
    }
  }, [fitTransformGroup, modelTransformGroup])

  useEffect(() => {
    modelTransformGroup.add(loaderTransformGroup)
    return () => {
      modelTransformGroup.remove(loaderTransformGroup)
    }
  }, [modelTransformGroup, loaderTransformGroup])

  useEffect(() => {
    while (loaderTransformGroup.children.length > 0) {
      const firstChild = loaderTransformGroup.children[0]
      if (!firstChild) break
      loaderTransformGroup.remove(firstChild)
    }
    if (model) {
      loaderTransformGroup.add(model)
    }
  }, [loaderTransformGroup, model])

  useEffect(() => {
    if (!sourceCoordinateTransform) {
      loaderTransformGroup.matrixAutoUpdate = true
      loaderTransformGroup.position.set(0, 0, 0)
      loaderTransformGroup.rotation.set(0, 0, 0)
      loaderTransformGroup.scale.set(1, 1, 1)
      loaderTransformGroup.updateMatrix()
      return
    }

    loaderTransformGroup.matrixAutoUpdate = false
    loaderTransformGroup.matrix.copy(sourceCoordinateTransform)
    loaderTransformGroup.matrixWorldNeedsUpdate = true
  }, [loaderTransformGroup, sourceCoordinateTransform])

  useEffect(() => {
    if (!rootObject) return

    rootObject.add(boardTransformGroup)
    return () => {
      rootObject.remove(boardTransformGroup)
    }
  }, [rootObject, boardTransformGroup])

  useEffect(() => {
    if (position) {
      boardTransformGroup.position.fromArray(position)
    } else {
      boardTransformGroup.position.set(0, 0, 0)
    }

    if (rotation) {
      boardTransformGroup.rotation.fromArray(rotation)
    } else {
      boardTransformGroup.rotation.set(0, 0, 0)
    }

    modelTransformGroup.position.fromArray(modelOffset)
    modelTransformGroup.rotation.fromArray(modelRotation)
    modelTransformGroup.scale.setScalar(scale ?? 1)

    if (!model) {
      fitTransformGroup.scale.set(1, 1, 1)
      return
    }

    fitTransformGroup.scale.set(1, 1, 1)
    fitTransformGroup.updateWorldMatrix(true, true)
    const fitScale = getCadModelFitScale(
      modelTransformGroup,
      modelSize,
      modelFitMode,
    )
    fitTransformGroup.scale.set(fitScale[0], fitScale[1], fitScale[2])
  }, [
    boardTransformGroup,
    fitTransformGroup,
    model,
    modelFitMode,
    modelOffset,
    loaderTransformGroup,
    modelTransformGroup,
    modelRotation,
    modelSize,
    position,
    rotation,
    scale,
  ])

  return { boardTransformGroup }
}
