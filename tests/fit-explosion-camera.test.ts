import { expect, test } from "bun:test"
import * as THREE from "three"
import { applyAssemblyOffsets } from "../src/assembly-explosion/AssemblyExplosionScene"
import {
  fitExplosionCamera,
  getVisibleSolidBounds,
} from "../src/assembly-explosion/fit-explosion-camera"

function corners(bounds: THREE.Box3) {
  return [bounds.min.x, bounds.max.x].flatMap((x) =>
    [bounds.min.y, bounds.max.y].flatMap((y) =>
      [bounds.min.z, bounds.max.z].map((z) => new THREE.Vector3(x, y, z)),
    ),
  )
}

function expectWithinViewport(camera: THREE.Camera, bounds: THREE.Box3) {
  for (const corner of corners(bounds)) {
    const projected = corner.project(camera)
    expect(Math.abs(projected.x)).toBeLessThan(1)
    expect(Math.abs(projected.y)).toBeLessThan(1)
    expect(Math.abs(projected.z)).toBeLessThan(1)
  }
}

test("bounds follow authored offsets, include earlier displaced parts and reset without a PCB", () => {
  const root = new THREE.Group()
  const part = new THREE.Group()
  part.userData.cad_component_id = "removed-lid"
  part.add(new THREE.Mesh(new THREE.BoxGeometry(2, 4, 6)))
  const second = new THREE.Group()
  second.userData.cad_component_id = "removed-carrier"
  second.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2)))
  root.add(part, second)
  const bases = new Map<THREE.Object3D, THREE.Vector3>()
  const initial = getVisibleSolidBounds(root)!
  applyAssemblyOffsets(
    root,
    new Map([
      ["removed-lid", new THREE.Vector3(200, 30, 10)],
      ["removed-carrier", new THREE.Vector3(-50, 0, 20)],
    ]),
    bases,
  )
  const exploded = getVisibleSolidBounds(root)!
  expect(exploded.min.toArray()).toEqual([-51, -1, 7])
  expect(exploded.max.toArray()).toEqual([201, 32, 21])
  applyAssemblyOffsets(root, new Map(), bases)
  expect(getVisibleSolidBounds(root)!.equals(initial)).toBe(true)
})

test("hidden ancestors, hidden materials, transparent solids and guide lines do not enlarge fitting", () => {
  const root = new THREE.Group()
  root.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2)))
  const hidden = new THREE.Group()
  hidden.visible = false
  hidden.add(new THREE.Mesh(new THREE.BoxGeometry(10000, 10000, 10000)))
  root.add(hidden)
  const invisibleMaterial = new THREE.MeshBasicMaterial({ visible: false })
  root.add(
    new THREE.Mesh(new THREE.BoxGeometry(5000, 5000, 5000), invisibleMaterial),
  )
  root.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(5000, 5000, 5000),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
    ),
  )
  root.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-10000, 0, 0),
        new THREE.Vector3(10000, 0, 0),
      ]),
    ),
  )
  expect(getVisibleSolidBounds(root)!.min.toArray()).toEqual([-1, -1, -1])
  expect(getVisibleSolidBounds(root)!.max.toArray()).toEqual([1, 1, 1])
  root.children[0]!.visible = false
  expect(getVisibleSolidBounds(root)).toBeNull()
})

test("nested world transforms and instanced solids contribute their rendered positions", () => {
  const root = new THREE.Group()
  root.position.set(10, 20, 30)
  const group = new THREE.Group()
  group.rotation.z = Math.PI / 2
  root.add(group)
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 6))
  mesh.position.x = 5
  group.add(mesh)
  const bounds = getVisibleSolidBounds(root)!
  expect(bounds.min.x).toBeCloseTo(8)
  expect(bounds.max.y).toBeCloseTo(26)
  expect(bounds.max.z).toBeCloseTo(33)
  const instances = new THREE.InstancedMesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshBasicMaterial(),
    2,
  )
  instances.setMatrixAt(0, new THREE.Matrix4().makeTranslation(100, 0, 0))
  instances.setMatrixAt(1, new THREE.Matrix4().makeTranslation(-100, 0, 0))
  const instanceRoot = new THREE.Group()
  instanceRoot.add(instances)
  expect(getVisibleSolidBounds(instanceRoot)!.min.x).toBe(-101)
  expect(getVisibleSolidBounds(instanceRoot)!.max.x).toBe(101)
})

test.each([0.4, 1, 2.4])(
  "perspective fit handles aspect %s, zoom, preserved direction and stable repeated fitting",
  (aspect) => {
    const camera = new THREE.PerspectiveCamera(45, aspect, 2, 10)
    camera.zoom = 2
    camera.up.set(0, 0, 1)
    camera.position.set(20, -30, 15)
    const controls = { target: new THREE.Vector3(2, 4, 3), update: () => {} }
    camera.lookAt(controls.target)
    const direction = camera.getWorldDirection(new THREE.Vector3())
    const bounds = new THREE.Box3(
      new THREE.Vector3(-130, -5, 10),
      new THREE.Vector3(230, 80, 65),
    )
    fitExplosionCamera(camera, bounds, controls)
    expect(
      camera.getWorldDirection(new THREE.Vector3()).distanceTo(direction),
    ).toBeLessThan(1e-12)
    expect(controls.target.equals(bounds.getCenter(new THREE.Vector3()))).toBe(
      true,
    )
    expectWithinViewport(camera, bounds)
    const position = camera.position.clone()
    fitExplosionCamera(camera, bounds, controls)
    expect(camera.position.distanceTo(position)).toBeLessThan(1e-10)
  },
)

test.each([0.4, 1, 2.4])(
  "orthographic fit handles aspect %s and large depth without clipping",
  (aspect) => {
    const camera = new THREE.OrthographicCamera(
      -10 * aspect,
      10 * aspect,
      10,
      -10,
      1,
      5,
    )
    camera.up.set(0, 0, 1)
    camera.position.set(5, -12, 7)
    camera.lookAt(0, 0, 0)
    const direction = camera.getWorldDirection(new THREE.Vector3())
    const bounds = new THREE.Box3(
      new THREE.Vector3(-80, -15, -200),
      new THREE.Vector3(100, 25, 200),
    )
    fitExplosionCamera(camera, bounds, null)
    expectWithinViewport(camera, bounds)
    expect(
      camera.getWorldDirection(new THREE.Vector3()).distanceTo(direction),
    ).toBeLessThan(1e-12)
    const position = camera.position.clone()
    const zoom = camera.zoom
    fitExplosionCamera(camera, bounds, null)
    expect(camera.position.distanceTo(position)).toBeLessThan(1e-10)
    expect(camera.zoom).toBe(zoom)
  },
)

test("empty and invalid geometry leave the camera unchanged", () => {
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(1, 2, 3)
  expect(fitExplosionCamera(camera, new THREE.Box3(), null)).toBeNull()
  expect(
    fitExplosionCamera(
      camera,
      new THREE.Box3(new THREE.Vector3(NaN, 0, 0), new THREE.Vector3(1, 1, 1)),
      null,
    ),
  ).toBeNull()
  expect(camera.position.toArray()).toEqual([1, 2, 3])
})
