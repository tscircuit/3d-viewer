import { expect, test } from "bun:test"
import * as THREE from "three"
import type { LineSegments2 } from "three-stdlib"
import { createEdgeOverlay } from "../src/utils/edge-overlay"

function setup() {
  const scene = new THREE.Scene()
  const root = new THREE.Group()
  const parent = new THREE.Group()
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial(),
  )
  parent.add(mesh)
  root.add(parent)
  scene.add(root)
  // A reference object outside the CAD root must not acquire outlines.
  scene.add(
    new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()),
  )
  return { scene, root, parent, mesh, overlay: createEdgeOverlay(root, scene) }
}

const lines = (group: THREE.Group) => {
  const result: LineSegments2[] = []
  group.traverse((object) => {
    if ((object as LineSegments2).isLineSegments2)
      result.push(object as LineSegments2)
  })
  return result
}
const visibleLines = (group: THREE.Group) =>
  lines(group).filter((line) => {
    let object: THREE.Object3D | null = line
    while (object) {
      if (!object.visible) return false
      object = object.parent
    }
    return true
  })

test("edge modes use solid visible and dashed depth-occluded screen-space strokes", () => {
  const { overlay, mesh } = setup()
  try {
    overlay.update("off", 2)
    expect(overlay.group.children).toHaveLength(0)
    overlay.update("hidden", 3)
    const strokes = lines(overlay.group)
    expect(strokes).toHaveLength(2)
    const visible = strokes.find(
      (line) => line.userData.edgeType === "visible",
    )!
    const hidden = strokes.find((line) => line.userData.edgeType === "hidden")!
    expect(visible.material.depthFunc).toBe(THREE.LessEqualDepth)
    expect(hidden.material.depthFunc).toBe(THREE.GreaterDepth)
    expect(hidden.material.dashed).toBe(true)
    expect(hidden.material.opacity).toBeLessThan(visible.material.opacity)
    for (const line of strokes) {
      expect(line.userData.sourceMeshUuid).toBe(mesh.uuid)
      expect(line.material.linewidth).toBe(3)
      expect(line.material.worldUnits).toBe(false)
      expect(line.material.depthWrite).toBe(false)
      expect(line.castShadow).toBe(false)
    }
    overlay.update("visible", 1)
    expect(
      lines(overlay.group)
        .filter((line) => line.visible)
        .every((line) => line.userData.edgeType === "visible"),
    ).toBe(true)
  } finally {
    overlay.dispose()
  }
})

test("overlays stay outside export and picking roots without modifying source materials", () => {
  const { overlay, root, scene, mesh } = setup()
  const geometry = mesh.geometry
  const material = mesh.material
  const materialBefore = material.toJSON()
  try {
    overlay.update("hidden", 4)
    expect(overlay.group.parent).toBe(scene)
    expect(root.getObjectById(overlay.group.id)).toBeUndefined()
    expect(mesh.children).toHaveLength(0)
    expect(mesh.geometry).toBe(geometry)
    expect(mesh.material).toBe(material)
    expect(material.toJSON()).toEqual(materialBefore)
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(0, 0, 5),
      new THREE.Vector3(0, 0, -1),
    )
    root.updateWorldMatrix(true, true)
    expect(
      raycaster.intersectObject(root, true).every((hit) => hit.object === mesh),
    ).toBe(true)
  } finally {
    overlay.dispose()
  }
})

test("moving nested parts carries their edges and hiding a parent removes their strokes", () => {
  const { overlay, scene, parent, mesh } = setup()
  try {
    parent.position.set(12, 4, 3)
    parent.rotation.z = Math.PI / 3
    mesh.scale.set(2, 0.5, 1)
    overlay.update("hidden", 2)
    scene.updateMatrixWorld(true)
    for (const line of lines(overlay.group))
      expect(line.matrixWorld.elements).toEqual(mesh.matrixWorld.elements)
    parent.visible = false
    overlay.update("hidden", 2)
    expect(visibleLines(overlay.group)).toHaveLength(0)
    parent.visible = true
    overlay.update("hidden", 2)
    expect(visibleLines(overlay.group)).toHaveLength(2)
  } finally {
    overlay.dispose()
  }
})

test("async mesh replacement frees overlay resources while preserving source geometry", () => {
  const { overlay, parent, mesh } = setup()
  let sourceDisposals = 0
  mesh.geometry.addEventListener("dispose", () => sourceDisposals++)
  try {
    overlay.update("hidden", 2)
    const oldLines = [...lines(overlay.group)]
    let edgeDisposals = 0
    for (const geometry of new Set(oldLines.map((line) => line.geometry)))
      geometry.addEventListener("dispose", () => edgeDisposals++)
    const next = new THREE.Mesh(
      new THREE.SphereGeometry(),
      new THREE.MeshBasicMaterial(),
    )
    parent.remove(mesh)
    parent.add(next)
    overlay.update("hidden", 2)
    expect(edgeDisposals).toBeGreaterThan(0)
    expect(
      lines(overlay.group).every(
        (line) => line.userData.sourceMeshUuid === next.uuid,
      ),
    ).toBe(true)
    expect(sourceDisposals).toBe(0)
    overlay.update("off", 2)
    expect(overlay.group.children).toHaveLength(0)
    expect(sourceDisposals).toBe(0)
  } finally {
    overlay.dispose()
  }
  expect(overlay.group.parent).toBeNull()
})

test("geometry edits regenerate edges but width changes reuse cached geometry", () => {
  const { overlay, mesh } = setup()
  try {
    overlay.update("visible", 2)
    const before = lines(overlay.group)[0]!.geometry
    overlay.update("hidden", 4)
    expect(lines(overlay.group)[0]!.geometry).toBe(before)
    mesh.geometry.getAttribute("position").needsUpdate = true
    overlay.update("hidden", 4)
    expect(lines(overlay.group)[0]!.geometry).not.toBe(before)
    mesh.geometry.setDrawRange(0, 0)
    overlay.update("hidden", 4)
    expect(visibleLines(overlay.group)).toHaveLength(0)
  } finally {
    overlay.dispose()
  }
})

test("transparent texture sheets and invisible materials do not gain phantom edges", () => {
  const { overlay, root, mesh } = setup()
  const texture = new THREE.Mesh(
    new THREE.PlaneGeometry(),
    new THREE.MeshBasicMaterial(),
  )
  texture.name = "top-board-texture-plane"
  root.add(texture)
  mesh.material.visible = false
  try {
    overlay.update("hidden", 2)
    expect(visibleLines(overlay.group)).toHaveLength(0)
  } finally {
    overlay.dispose()
  }
})
