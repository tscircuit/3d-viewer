import * as THREE from "three"
import type {
  CadComponentId,
  ExplodedViewSceneConfig,
  ExplodedViewScenePart,
} from "./exploded-view-types"

interface ExplodedComponentState {
  cadComponentGroup: THREE.Object3D
  basePosition: THREE.Vector3
  offset: THREE.Vector3
}

export interface ExplodedViewSceneState {
  components: Map<CadComponentId, ExplodedComponentState>
}

export const createExplodedViewSceneState = (): ExplodedViewSceneState => ({
  components: new Map(),
})

const findCadComponentGroups = (rootObject: THREE.Object3D) => {
  const cadComponentGroups = new Map<CadComponentId, THREE.Object3D>()
  rootObject.traverse((cadComponentGroup) => {
    const cadComponentId = cadComponentGroup.userData.cad_component_id
    if (typeof cadComponentId === "string") {
      cadComponentGroups.set(cadComponentId, cadComponentGroup)
    }
  })
  return cadComponentGroups
}

const easeInOut = (explodedViewAmount: number) => {
  const clampedAmount = THREE.MathUtils.clamp(explodedViewAmount, 0, 1)
  return clampedAmount * clampedAmount * (3 - 2 * clampedAmount)
}

export const resetExplodedViewScene = (
  explodedViewSceneState: ExplodedViewSceneState,
) => {
  for (const explodedComponentState of explodedViewSceneState.components.values()) {
    explodedComponentState.cadComponentGroup.position.copy(
      explodedComponentState.basePosition,
    )
  }
  explodedViewSceneState.components.clear()
}

export const applyExplodedViewToScene = ({
  rootObject,
  explodedViewAmount,
  explodedViewSceneConfig,
  explodedViewSceneState,
}: {
  rootObject: THREE.Object3D
  explodedViewAmount: number
  explodedViewSceneConfig: ExplodedViewSceneConfig
  explodedViewSceneState: ExplodedViewSceneState
}) => {
  const cadComponentGroups = findCadComponentGroups(rootObject)
  const scenePartByCadComponentId = new Map<
    CadComponentId,
    ExplodedViewScenePart
  >(
    explodedViewSceneConfig.parts.map((scenePart) => [
      scenePart.cadComponentId,
      scenePart,
    ]),
  )

  for (const [
    cadComponentId,
    explodedComponentState,
  ] of explodedViewSceneState.components) {
    if (
      !scenePartByCadComponentId.has(cadComponentId) ||
      cadComponentGroups.get(cadComponentId) !==
        explodedComponentState.cadComponentGroup
    ) {
      explodedComponentState.cadComponentGroup.position.copy(
        explodedComponentState.basePosition,
      )
      explodedViewSceneState.components.delete(cadComponentId)
    }
  }

  for (const scenePart of explodedViewSceneConfig.parts) {
    const { cadComponentId } = scenePart
    const cadComponentGroup = cadComponentGroups.get(cadComponentId)
    if (!cadComponentGroup) continue
    const current = explodedViewSceneState.components.get(cadComponentId)
    if (!current || current.cadComponentGroup !== cadComponentGroup) {
      explodedViewSceneState.components.set(cadComponentId, {
        cadComponentGroup,
        basePosition: cadComponentGroup.position.clone(),
        offset: scenePart.offset.clone(),
      })
    } else {
      current.offset.copy(scenePart.offset)
    }
  }

  const easedAmount = easeInOut(explodedViewAmount)
  for (const explodedComponentState of explodedViewSceneState.components.values()) {
    explodedComponentState.cadComponentGroup.position
      .copy(explodedComponentState.basePosition)
      .addScaledVector(explodedComponentState.offset, easedAmount)
  }
  rootObject.updateMatrixWorld(true)

  return {
    ready: explodedViewSceneConfig.parts.every((scenePart) =>
      cadComponentGroups.has(scenePart.cadComponentId),
    ),
  }
}
