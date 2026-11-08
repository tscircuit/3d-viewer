import { expect, test, spyOn } from "bun:test"
import type { AssemblyExplosionView } from "@tscircuit/core"
import * as THREE from "three"
import { getAssemblyGuidePoints } from "../src/assembly-explosion/assembly-guide-points"

function makeView(x = 0): AssemblyExplosionView {
  return {
    circuitJson: [
      {
        type: "cad_component",
        cad_component_id: "part",
        source_component_id: "source",
        position: { x, y: 0, z: 10 },
        anchor_alignment: "center",
        model_object_fit: "contain_within_bounds",
      },
    ],
    stages: ["lift", "slide"],
    lines: [
      {
        stageRef: "lift",
        targetRef: "part",
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 0, z: 10 },
        ],
      },
      ...(x
        ? [
            {
              stageRef: "slide",
              targetRef: "part",
              points: [
                { x: 0, y: 0, z: 10 },
                { x, y: 0, z: 10 },
              ],
            },
          ]
        : []),
    ],
    collisionCheckStatus: "not_implemented",
  }
}

test("guide paths connect to offset geometry through root and nested model transforms", () => {
  const root = new THREE.Group()
  root.rotation.x = -Math.PI / 2
  root.scale.setScalar(2)
  root.position.set(100, 200, 300)
  const group = new THREE.Group()
  group.userData.cad_component_id = "part"
  group.position.z = 10
  root.add(group)
  const model = new THREE.Group()
  model.position.set(20, 25, 30)
  model.rotation.z = Math.PI / 3
  group.add(model)
  const geometry = new THREE.BoxGeometry(4, 6, 8)
  model.add(new THREE.Mesh(geometry))
  const computeBounds = spyOn(geometry, "computeBoundingBox")
  try {
    const first = getAssemblyGuidePoints(root, makeView())
    expect(first[0]!.distanceTo(new THREE.Vector3(20, 25, 30))).toBeLessThan(
      0.00001,
    )
    expect(first[1]!.distanceTo(new THREE.Vector3(20, 25, 40))).toBeLessThan(
      0.00001,
    )
    group.position.x = 5
    const next = getAssemblyGuidePoints(root, makeView(5))
    expect(next[1]!.distanceTo(next[2]!)).toBeLessThan(0.00001)
    expect(next[3]!.distanceTo(new THREE.Vector3(25, 25, 40))).toBeLessThan(
      0.00001,
    )
    expect(computeBounds).toHaveBeenCalledTimes(1)
  } finally {
    computeBounds.mockRestore()
    geometry.dispose()
  }
})

test("guides wait for asynchronous geometry and disappear when the target is removed", () => {
  const root = new THREE.Group()
  const group = new THREE.Group()
  group.userData.cad_component_id = "part"
  group.position.z = 10
  root.add(group)
  expect(getAssemblyGuidePoints(root, makeView())).toEqual([])
  const geometry = new THREE.BoxGeometry(2, 2, 2).translate(15, 20, 25)
  group.add(new THREE.Mesh(geometry))
  expect(getAssemblyGuidePoints(root, makeView())[1]!.toArray()).toEqual([
    15, 20, 35,
  ])
  root.remove(group)
  expect(getAssemblyGuidePoints(root, makeView())).toEqual([])
  geometry.dispose()
})
