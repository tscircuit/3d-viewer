import * as THREE from "three"
import type { PcbBoard } from "circuit-json"
import { calculateOutlineBounds } from "./outline-bounds"

type ShadowOptions = {
  castShadow?: boolean
  receiveShadow?: boolean
}

export const configureObjectShadows = (
  object: THREE.Object3D,
  { castShadow = true, receiveShadow = true }: ShadowOptions = {},
) => {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    child.castShadow = castShadow
    child.receiveShadow = receiveShadow
  })
}
