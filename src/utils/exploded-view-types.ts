import type { CadComponent } from "circuit-json"
import type * as THREE from "three"

export type CadComponentId = CadComponent["cad_component_id"]

export interface ExplodedViewScenePart {
  cadComponentId: CadComponentId
  offset: THREE.Vector3
}

export interface ExplodedViewSceneConfig {
  parts: ExplodedViewScenePart[]
}
