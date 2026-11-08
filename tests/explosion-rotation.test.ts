import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { useAssemblyExplosion } from "../src/assembly-explosion/use-assembly-explosion"
import * as THREE from "three"
import type { AnyCircuitElement } from "circuit-json"
import { createExplosionEvaluator } from "../src/assembly-explosion/create-explosion-evaluator"
import { applyAssemblyTransforms } from "../src/assembly-explosion/AssemblyExplosionScene"
import { getAssemblyGuidePoints } from "../src/assembly-explosion/assembly-guide-points"
import type { AssemblyExplosionRotation } from "../src/assembly-explosion/rotation-playback"

const fixture: AnyCircuitElement[] = [
  {
    type: "cad_component",
    cad_component_id: "lid",
    position: { x: 2, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  {
    type: "cad_component",
    cad_component_id: "button",
    position: { x: 4, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  ...["lift", "flip", "move-button"].map((name, order) => ({
    type: "cad_explosion_stage",
    cad_explosion_stage_id: name,
    name,
    order,
    cad_component_ids: order === 2 ? ["button"] : ["lid", "button"],
    cad_reference_surface_ids: [],
  })),
  ...["lift", "flip", "move-button"].map((stage, order) => ({
    type: "cad_explosion_move",
    cad_explosion_move_id: `move-${stage}`,
    cad_explosion_stage_id: stage,
    order: 0,
    targets: (order === 2 ? ["button"] : ["lid", "button"]).map((id) => ({
      type: "cad_component",
      cad_component_id: id,
    })),
    translation:
      order === 0
        ? { x: 0, y: 0, z: 10 }
        : order === 2
          ? { x: 0, y: 5, z: 0 }
          : { x: 0, y: 0, z: 0 },
  })),
] as AnyCircuitElement[]
const rotations: AssemblyExplosionRotation[] = [
  { stageName: "flip", axis: "y", angleDegrees: 180, pivot: [0, 0, 10] },
]
const close = (actual: number[], expected: number[]) =>
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i]!, 6))

test("rotation uses the authored pivot and preserves previous moves through seeking and subsequent world-space translation", () => {
  const evaluate = createExplosionEvaluator(fixture, rotations)
  for (const [progress, expected] of [
    [0, [2, 0, 10]],
    [0.5, [0, 0, 8]],
    [1, [-2, 0, 10]],
    [0.5, [0, 0, 8]],
    [0, [2, 0, 10]],
  ] as const) {
    const view = evaluate({ throughStageRef: "flip", stageProgress: progress })
    const lid = view.circuitJson.find(
      (e) => e.type === "cad_component" && e.cad_component_id === "lid",
    )!
    if (lid.type !== "cad_component") throw new Error("Missing lid")
    close([lid.position.x, lid.position.y, lid.position.z], [...expected])
  }
  const final = evaluate()
  close(
    new THREE.Vector3(4, 0, 0)
      .applyMatrix4(final.assemblyTransforms!.get("button")!)
      .toArray(),
    [-4, 5, 10],
  )
  expect(fixture[0]).toMatchObject({ position: { x: 2, y: 0, z: 0 } })
})

test("rotation updates baked geometry, draws an anchored arc, and restores orientation on reset including late-loaded groups", () => {
  const root = new THREE.Group()
  root.rotation.x = -Math.PI / 2
  const group = new THREE.Group()
  group.userData.cad_component_id = "lid"
  root.add(group)
  // Geometry offset lives inside the mesh, as it does in the GBA GLBs.
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
  mesh.position.x = 2
  group.add(mesh)
  const bases = new Map<THREE.Object3D, THREE.Matrix4>()
  const evaluate = createExplosionEvaluator(fixture, rotations)
  const view = evaluate({ throughStageRef: "flip", stageProgress: 0.5 })
  applyAssemblyTransforms(root, view.assemblyTransforms!, bases)
  applyAssemblyTransforms(root, view.assemblyTransforms!, bases)
  close(mesh.position.clone().applyMatrix4(group.matrix).toArray(), [0, 0, 8])
  const guides = getAssemblyGuidePoints(root, view)
  close(guides.at(-1)!.toArray(), [0, 0, 8])
  expect(guides.length).toBeGreaterThan(4)
  const late = group.clone()
  late.userData.cad_component_id = "button"
  late.position.set(0, 0, 0)
  late.quaternion.identity()
  root.add(late)
  applyAssemblyTransforms(root, view.assemblyTransforms!, bases)
  expect(late.quaternion.angleTo(group.quaternion)).toBeLessThan(1e-6)
  applyAssemblyTransforms(root, new Map(), bases)
  close(group.position.toArray(), [0, 0, 0])
  close(group.quaternion.toArray(), [0, 0, 0, 1])
  close(group.scale.toArray(), [1, 1, 1])
})

test("invalid or duplicate rotation cues fail before playback", () => {
  expect(() =>
    createExplosionEvaluator(fixture, [
      { ...rotations[0]!, stageName: "missing" },
    ]),
  ).toThrow("Unknown rotation")
  expect(() =>
    createExplosionEvaluator(fixture, [rotations[0]!, rotations[0]!]),
  ).toThrow("Duplicate rotation")
  expect(() =>
    createExplosionEvaluator(fixture, [
      { ...rotations[0]!, angleDegrees: NaN },
    ]),
  ).toThrow("finite")
})

test("the lazy assembly hook preserves rotations and reevaluates changes to rotation cues", async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    IS_REACT_ACT_ENVIRONMENT: (globalThis as any).IS_REACT_ACT_ENVIRONMENT,
  }
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  let state!: ReturnType<typeof useAssemblyExplosion>
  function Harness({ cues }: { cues: readonly AssemblyExplosionRotation[] }) {
    state = useAssemblyExplosion(undefined, undefined, fixture, cues)
    return null
  }
  const root = createRoot(document.getElementById("root")!)
  try {
    await act(async () =>
      root.render(createElement(Harness, { cues: rotations })),
    )
    for (let attempt = 0; attempt < 50 && !state.stages.length; attempt++)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
    expect(state.stages).toEqual(["lift", "flip", "move-button"])
    await act(async () => state.setAmount(2))
    const lidPosition = () =>
      new THREE.Vector3(2, 0, 0)
        .applyMatrix4(state.view!.assemblyTransforms!.get("lid")!)
        .toArray()
    close(lidPosition(), [-2, 0, 10])
    await act(async () =>
      root.render(
        createElement(Harness, {
          cues: [{ ...rotations[0]!, angleDegrees: 90 }],
        }),
      ),
    )
    close(lidPosition(), [0, 0, 8])
  } finally {
    await act(async () => root.unmount())
    Object.assign(globalThis, previous)
    dom.window.close()
  }
})
