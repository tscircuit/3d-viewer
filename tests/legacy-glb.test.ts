import { expect, test } from "bun:test"
import * as THREE from "three"
import { disposeGlbScene, loadGlbScene } from "../src/utils/prerendered-glb"
import { pickCadComponent } from "../src/utils/pick-cad-component"
import { pickSchematicComponent } from "../src/utils/pick-schematic-component"

// Retain the fixture's binary data, but model an old export with two instances
// of a multi-primitive mesh and no component extras.
async function legacyFixture() {
  const bytes = await Bun.file(
    new URL("./assets/prerendered-components.glb", import.meta.url),
  ).arrayBuffer()
  const jsonLength = new DataView(bytes).getUint32(12, true)
  const json = JSON.parse(
    new TextDecoder().decode(bytes.slice(20, 20 + jsonLength)),
  )
  for (const node of json.nodes) delete node.extras
  json.meshes[0].primitives.push({ ...json.meshes[0].primitives[0] })
  // Empty assembly nodes should not acquire a hide identity.
  json.nodes.push({ name: "Assembly", children: [0, 1] })
  json.scenes[0].nodes = [2]
  const encoded = new TextEncoder().encode(JSON.stringify(json))
  const paddedLength = Math.ceil(encoded.length / 4) * 4
  const binaryChunk = new Uint8Array(bytes, 20 + jsonLength)
  const result = new ArrayBuffer(20 + paddedLength + binaryChunk.length)
  const view = new DataView(result)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, result.byteLength, true)
  view.setUint32(12, paddedLength, true)
  view.setUint32(16, 0x4e4f534a, true)
  new Uint8Array(result, 20, paddedLength).fill(32)
  new Uint8Array(result, 20, encoded.length).set(encoded)
  new Uint8Array(result, 20 + paddedLength).set(binaryChunk)
  return result
}

test("legacy mesh nodes retain labels and hide as complete, independent parts", async () => {
  const model = await loadGlbScene(
    await legacyFixture(),
    new AbortController().signal,
  )
  const parts: THREE.Object3D[] = []
  model.traverse((object) => {
    if (object.userData.cad_component_id) parts.push(object)
  })
  expect(parts).toHaveLength(2)
  expect(
    new Set(parts.map((part) => part.userData.cad_component_id)).size,
  ).toBe(2)
  expect(parts.every((part) => part.children.length === 2)).toBe(true)
  const scene = {
    rootObject: model,
    camera: new THREE.PerspectiveCamera(45, 1, 0.1, 100),
    renderer: {
      domElement: {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 200,
          height: 200,
        }),
      },
    } as THREE.WebGLRenderer,
  }
  const position = { x: 100, y: 100 }
  scene.camera.position.set(5, 7, 30)
  const picked = pickCadComponent(scene, position, [])!
  expect(picked.componentName).toBe("U1")
  expect(pickSchematicComponent(scene, position, [])).toBeUndefined()
  const part = parts.find(
    (object) => object.userData.cad_component_id === picked.cad_component_id,
  )!
  part.visible = false
  expect(pickCadComponent(scene, position, [])).toBeUndefined()
  scene.camera.position.set(15, 7, 30)
  expect(pickCadComponent(scene, position, [])?.cad_component_id).not.toBe(
    picked.cad_component_id,
  )
  part.visible = true
  scene.camera.position.set(5, 7, 30)
  expect(pickCadComponent(scene, position, [])).toEqual(picked)
  disposeGlbScene(model)
})

test("original published fidget GLB exposes all 39 named mesh nodes", async () => {
  const model = await loadGlbScene(
    await Bun.file(
      new URL(
        "../stories/assets/prerendered-glb/fidget-counter-legacy.glb",
        import.meta.url,
      ),
    ).arrayBuffer(),
    new AbortController().signal,
  )
  const parts: THREE.Object3D[] = []
  model.traverse((object) => {
    if (object.userData.cad_component_id) parts.push(object)
  })
  expect(parts).toHaveLength(39)
  expect(
    parts.find(
      (part) =>
        part.userData.tscircuit.componentName === "ONEPIECE_V4_Cap_circular",
    ),
  ).toBeDefined()
  expect(
    parts.every(
      (part) =>
        !part.userData.source_component_id && !part.userData.pcb_component_id,
    ),
  ).toBe(true)
  disposeGlbScene(model)
})
