import { expect, test } from "bun:test"
import * as THREE from "three"
import {
  applyExplodedViewToScene,
  createExplodedViewSceneState,
} from "../src/utils/apply-exploded-view"

const addExplodedPart = ({
  rootObject,
  cadComponentId,
}: {
  rootObject: THREE.Object3D
  cadComponentId: string
}) => {
  const cadComponentGroup = new THREE.Group()
  cadComponentGroup.userData.cad_component_id = cadComponentId
  rootObject.add(cadComponentGroup)
  return cadComponentGroup
}

test("applies and clears exploded offsets on CAD component groups", () => {
  const rootObject = new THREE.Group()
  const pcb = addExplodedPart({
    rootObject,
    cadComponentId: "pcb",
  })
  const lid = addExplodedPart({
    rootObject,
    cadComponentId: "lid",
  })
  const base = addExplodedPart({
    rootObject,
    cadComponentId: "base",
  })
  const explodedViewSceneState = createExplodedViewSceneState()
  const explodedViewSceneConfig = {
    parts: [
      { cadComponentId: "lid", offset: new THREE.Vector3(0, 0, 30) },
      { cadComponentId: "base", offset: new THREE.Vector3(0, 0, -20) },
    ],
  }

  const updateResult = applyExplodedViewToScene({
    rootObject,
    explodedViewAmount: 1,
    explodedViewSceneConfig,
    explodedViewSceneState,
  })

  expect(updateResult.ready).toBe(true)
  expect(pcb.position.length()).toBe(0)
  expect(lid.position.toArray()).toEqual([0, 0, 30])
  expect(base.position.toArray()).toEqual([0, 0, -20])

  applyExplodedViewToScene({
    rootObject,
    explodedViewAmount: 0,
    explodedViewSceneConfig,
    explodedViewSceneState,
  })

  expect(pcb.position.toArray()).toEqual([0, 0, 0])
  expect(lid.position.toArray()).toEqual([0, 0, 0])
  expect(base.position.toArray()).toEqual([0, 0, 0])
})
