import type { CadComponent, CadModelAxisDirection } from "circuit-json"
import * as THREE from "three"
import {
  applyCoordinateTransform,
  getCadLoaderTransformConfig,
} from "./cad-model-loader-transform"
import type { RenderedCadModelType } from "./get-cad-model-type"

type Layer = "top" | "bottom" | string
type CadComponentWithPlacementFields = CadComponent & {
  model_board_normal_direction?: CadModelAxisDirection
  model_origin_position?: {
    x: number
    y: number
    z: number
  }
  model_object_fit?: "contain_within_bounds" | "fill_bounds"
  size?: {
    x: number
    y: number
    z: number
  }
}

export type CadModelTransform = {
  position?: [number, number, number]
  rotation: [number, number, number]
  modelPosition: [number, number, number]
  modelRotation: [number, number, number]
  scale?: number
  fitMode: "contain_within_bounds" | "fill_bounds"
  size?: [number, number, number]
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function getOrientationRotationForBoardNormal(
  modelBoardNormalDirection: CadModelAxisDirection,
): [number, number, number] {
  if (modelBoardNormalDirection === "z+") {
    return [0, 0, 0]
  }

  switch (modelBoardNormalDirection) {
    case "x+":
      return [0, toRadians(-90), 0]
    case "x-":
      return [0, toRadians(90), 0]
    case "y+":
      return [toRadians(90), 0, 0]
    case "y-":
      return [toRadians(-90), 0, 0]
    case "z-":
      return [toRadians(180), 0, 0]
    default:
      return [0, 0, 0]
  }
}

const BOARD_MIDPLANE_Z_EPSILON = 1e-6

function getAdjustedCadPosition(
  cadComponent: CadComponent,
  layer: Layer,
  pcbThickness: number,
): [number, number, number] | undefined {
  if (!cadComponent.position) {
    return undefined
  }

  let boardRelativeZ = cadComponent.position.z ?? 0
  const isAtBoardMidplane = Math.abs(boardRelativeZ) < BOARD_MIDPLANE_Z_EPSILON

  if (layer === "bottom") {
    if (isAtBoardMidplane) {
      boardRelativeZ = -pcbThickness / 2
    } else if (boardRelativeZ >= 0) {
      boardRelativeZ = -(boardRelativeZ + pcbThickness)
    }
  } else if (isAtBoardMidplane) {
    // circuit-json (and older core panel output) sometimes emits z=0, which is
    // the mesh midplane. Place those models on the top surface instead.
    boardRelativeZ = pcbThickness / 2
  }

  return [cadComponent.position.x, cadComponent.position.y, boardRelativeZ]
}

function getBaseCadRotation(
  cadComponent: CadComponent,
  layer: Layer,
): [number, number, number] {
  if (!cadComponent.rotation) {
    return layer === "bottom" ? [Math.PI, 0, 0] : [0, 0, 0]
  }

  return [
    toRadians(cadComponent.rotation.x),
    toRadians(cadComponent.rotation.y),
    toRadians(cadComponent.rotation.z),
  ]
}

function rotateOriginPosition(
  origin: NonNullable<CadComponentWithPlacementFields["model_origin_position"]>,
  boardNormalRotation: [number, number, number],
): [number, number, number] {
  const vector = new THREE.Vector3(origin.x, origin.y, origin.z)
  const euler = new THREE.Euler(
    boardNormalRotation[0],
    boardNormalRotation[1],
    boardNormalRotation[2],
    "XYZ",
  )
  vector.applyEuler(euler)
  return [vector.x, vector.y, vector.z]
}

function getModelOriginOffset(
  cadComponent: CadComponentWithPlacementFields,
  loaderTransform: ReturnType<typeof getCadLoaderTransformConfig>,
  modelRotation: [number, number, number],
): [number, number, number] {
  if (!cadComponent.model_origin_position) {
    return [0, 0, 0]
  }

  const originInLoaderSpace = loaderTransform
    ? applyCoordinateTransform(
        cadComponent.model_origin_position,
        loaderTransform,
      )
    : cadComponent.model_origin_position

  return rotateOriginPosition(originInLoaderSpace, modelRotation)
}

export function getCadModelTransform(
  cadComponent: CadComponentWithPlacementFields,
  options: {
    layer: Layer
    pcbThickness: number
    modelType: RenderedCadModelType
  },
): CadModelTransform {
  const position = getAdjustedCadPosition(
    cadComponent,
    options.layer,
    options.pcbThickness,
  )
  const rotation = getBaseCadRotation(cadComponent, options.layer)
  const loaderTransform = getCadLoaderTransformConfig(
    cadComponent,
    options.modelType,
  )
  const modelRotation = getOrientationRotationForBoardNormal(
    cadComponent.model_board_normal_direction ?? "z+",
  )
  const rotatedOrigin = getModelOriginOffset(
    cadComponent,
    loaderTransform,
    modelRotation,
  )

  return {
    position,
    rotation,
    modelPosition: [-rotatedOrigin[0], -rotatedOrigin[1], -rotatedOrigin[2]],
    modelRotation,
    scale: cadComponent.model_unit_to_mm_scale_factor ?? undefined,
    fitMode: cadComponent.model_object_fit ?? "contain_within_bounds",
    size: cadComponent.size
      ? [cadComponent.size.x, cadComponent.size.y, cadComponent.size.z]
      : undefined,
  }
}
