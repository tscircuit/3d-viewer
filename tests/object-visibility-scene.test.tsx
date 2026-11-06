import { expect, test } from "bun:test"
import * as THREE from "three"
import { GlbScene } from "../src/CadViewerGlb"
import { BoardMeshes } from "../src/CadViewerManifold"
import { BoardGroup } from "../src/three-components/BoardGroup"
import type { ObjectVisibility } from "../src/utils/object-visibility"
import { pickSceneObject } from "../src/utils/pick-scene-object"
import {
  center,
  setupObjectVisibilityScene as setup,
} from "./fixtures/object-visibility-scene"

const box = (name: string, size: number, z = 0) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, 1),
    new THREE.MeshBasicMaterial(),
  )
  mesh.name = name
  mesh.position.z = z
  return mesh
}

test("board meshes are picked and hidden as one board object", async () => {
  const { context, rootObject, render, cleanup } = setup()
  const boardGeom = box("board-geom", 10)
  const via = box("via-1", 1, 1)
  // A component under the board, revealed once the board is hidden.
  const component = new THREE.Group()
  component.userData.cad_component_id = "motor_cad"
  component.add(box("motor", 2, -3))
  rootObject.add(component)
  const circuitJson = [
    { type: "source_component", source_component_id: "s1", name: "MOTOR" },
    {
      type: "cad_component",
      cad_component_id: "motor_cad",
      source_component_id: "s1",
    },
  ] as any[]
  const renderBoard = (hidden: boolean) =>
    render(
      <BoardGroup pcbBoardId="pcb_board_0" hidden={hidden}>
        <BoardMeshes geometryMeshes={[boardGeom, via]} textureMeshes={[]} />
      </BoardGroup>,
    )
  try {
    await renderBoard(false)
    const group = boardGeom.parent!
    expect(group.parent).toBe(rootObject)
    expect(via.parent).toBe(group)
    expect(group.userData.pcb_board_id).toBe("pcb_board_0")
    expect(pickSceneObject(context, center, circuitJson)).toEqual({
      objectId: "pcb_board_0",
      name: "Board",
    })
    await renderBoard(true)
    // Hiding keeps the built meshes attached for a cheap unhide.
    expect(boardGeom.parent).toBe(group)
    expect(group.visible).toBe(false)
    expect(pickSceneObject(context, center, circuitJson)).toEqual({
      objectId: "motor_cad",
      name: "MOTOR",
    })
    await renderBoard(false)
    expect(group.visible).toBe(true)
    expect(pickSceneObject(context, center, circuitJson)?.objectId).toBe(
      "pcb_board_0",
    )
  } finally {
    await cleanup()
  }
  expect(rootObject.children).toEqual([component])
})

test("isolating a GLB component hides untagged board geometry", async () => {
  const { render, cleanup } = setup()
  const model = new THREE.Group()
  const board = box("Box0", 10)
  const component = new THREE.Group()
  component.userData.cad_component_id = "cad1"
  const componentMesh = box("U1 body", 2, 1)
  component.add(componentMesh)
  model.add(board, component)
  const renderGlb = (objectVisibility?: ObjectVisibility) =>
    render(<GlbScene model={model} objectVisibility={objectVisibility} />)
  try {
    await renderGlb({ hiddenIds: new Set(), isolatedId: "cad1" })
    expect(board.visible).toBe(false)
    expect(component.visible).toBe(true)
    // Meshes inside a component follow the component, not the isolation rule.
    expect(componentMesh.visible).toBe(true)
    await renderGlb({ hiddenIds: new Set(["cad1"]) })
    expect(board.visible).toBe(true)
    expect(component.visible).toBe(false)
    await renderGlb()
    expect(board.visible).toBe(true)
    expect(component.visible).toBe(true)
  } finally {
    await cleanup()
  }
})
