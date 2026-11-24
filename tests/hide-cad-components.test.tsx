import { expect, test } from "bun:test"
import * as THREE from "three"
import type { CadViewerProps } from "../src/CadViewer"
import { GlbScene } from "../src/CadViewerGlb"
import { getVisibleCadComponents } from "../src/utils/object-visibility"
import { setupObjectVisibilityScene as setup } from "./fixtures/object-visibility-scene"

const box = (name: string, size: number, z = 0) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, 1),
    new THREE.MeshBasicMaterial(),
  )
  mesh.name = name
  mesh.position.z = z
  return mesh
}

test("getVisibleCadComponents hides all cad_components when hideCadComponents is true", () => {
  const components = [
    { cad_component_id: "cad_1" },
    { cad_component_id: "cad_2" },
  ]

  expect(getVisibleCadComponents(components, undefined)).toEqual(components)
  expect(getVisibleCadComponents(components, undefined, false)).toEqual(
    components,
  )
  expect(getVisibleCadComponents(components, undefined, true)).toEqual([])
  expect(
    getVisibleCadComponents(
      components,
      { hiddenIds: new Set(["cad_1"]) },
      false,
    ),
  ).toEqual([{ cad_component_id: "cad_2" }])
  expect(
    getVisibleCadComponents(
      components,
      { hiddenIds: new Set(["cad_1"]) },
      true,
    ),
  ).toEqual([])
})

test("GlbScene hides cad_components while keeping board visible when hideCadComponents is true", async () => {
  const { render, cleanup } = setup()
  const model = new THREE.Group()
  const board = new THREE.Group()
  board.userData.pcb_board_id = "pcb_board_0"
  board.add(box("BoardMesh", 10))

  const untaggedBoard = box("LegacyBoard", 10)

  const component = new THREE.Group()
  component.userData.cad_component_id = "cad_u1"
  component.add(box("U1", 2, 1))

  model.add(board, untaggedBoard, component)

  try {
    // Default (omitted): both board and component are visible
    await render(<GlbScene model={model} />)
    expect(board.visible).toBe(true)
    expect(untaggedBoard.visible).toBe(true)
    expect(component.visible).toBe(true)

    // hideCadComponents=true: component hidden, board remains visible
    await render(<GlbScene model={model} hideCadComponents />)
    expect(board.visible).toBe(true)
    expect(untaggedBoard.visible).toBe(true)
    expect(component.visible).toBe(false)

    // Toggling back to false restores component visibility
    await render(<GlbScene model={model} hideCadComponents={false} />)
    expect(board.visible).toBe(true)
    expect(untaggedBoard.visible).toBe(true)
    expect(component.visible).toBe(true)
  } finally {
    await cleanup()
  }
})

test("CadViewerProps accepts hideCadComponents boolean prop", () => {
  const props: CadViewerProps = { hideCadComponents: true }
  expect(props.hideCadComponents).toBe(true)
})
