import { expect, test } from "bun:test"
import type { AnyCircuitElement, CadComponent, PcbPanel } from "circuit-json"
import { JSDOM } from "jsdom"
import { convertCircuitJsonTo3dSvg } from "../src/convert-circuit-json-to-3d-svg"
import { applyJsdomShim } from "../src/utils/jsdom-shim"
import { normalizePanelCircuitJson } from "../src/utils/preprocess-circuit-json"
import { resolveViewerBoardData } from "../src/utils/resolve-panel-board-data"

const createPanelCircuitJson = (): AnyCircuitElement[] => {
  const boardCenters = [
    { id: "board_0", x: -8, y: 6 },
    { id: "board_1", x: 8, y: 6 },
    { id: "board_2", x: -8, y: -6 },
    { id: "board_3", x: 8, y: -6 },
  ]

  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_panel",
      pcb_panel_id: "pcb_panel_0",
      width: 36,
      height: 28,
      center: { x: 18, y: 14 },
      covered_with_solder_mask: true,
    } as PcbPanel,
  ]

  boardCenters.forEach((b, idx) => {
    elements.push(
      {
        type: "pcb_board",
        pcb_board_id: b.id,
        center: { x: b.x, y: b.y },
        width: 12,
        height: 8,
        thickness: 1.4,
        num_layers: 2,
        material: "fr4",
        position_mode: "relative_to_panel_anchor",
      } as AnyCircuitElement,
      {
        type: "pcb_component",
        pcb_component_id: `pcb_r_${idx}`,
        source_component_id: `src_r_${idx}`,
        pcb_board_id: b.id,
        center: { x: b.x - 3, y: b.y },
        width: 1.6,
        height: 0.8,
        layer: "top",
        rotation: 0,
        obstructs_within_bounds: true,
      } as AnyCircuitElement,
      {
        type: "cad_component",
        cad_component_id: `cad_r_${idx}`,
        pcb_component_id: `pcb_r_${idx}`,
        source_component_id: `src_r_${idx}`,
        position: { x: 0, y: 0, z: 0.7 },
        rotation: { x: 0, y: 0, z: 0 },
        footprinter_string: "0603",
      } as AnyCircuitElement,
      {
        type: "pcb_component",
        pcb_component_id: `pcb_c_${idx}`,
        source_component_id: `src_c_${idx}`,
        pcb_board_id: b.id,
        center: { x: b.x + 3, y: b.y },
        width: 2.0,
        height: 1.25,
        layer: "top",
        rotation: 0,
        obstructs_within_bounds: true,
      } as AnyCircuitElement,
      {
        type: "cad_component",
        cad_component_id: `cad_c_${idx}`,
        pcb_component_id: `pcb_c_${idx}`,
        source_component_id: `src_c_${idx}`,
        position: { x: b.x, y: b.y, z: 0.7 },
        rotation: { x: 0, y: 0, z: 0 },
        footprinter_string: "0805",
      } as AnyCircuitElement,
    )
  })

  return elements
}

test("normalizes panel center and aligns cad_component positions across panelized boards", async () => {
  const dom = new JSDOM()
  applyJsdomShim(dom)

  const rawCircuitJson = createPanelCircuitJson()
  const normalized = normalizePanelCircuitJson(rawCircuitJson)

  const panel = normalized.find((el): el is PcbPanel => el.type === "pcb_panel")
  expect(panel?.center).toEqual({ x: 0, y: 0 })

  const boardData = resolveViewerBoardData(normalized)
  expect(boardData).toMatchObject({
    pcb_board_id: "pcb_panel_0",
    width: 36,
    height: 28,
    center: { x: 0, y: 0 },
    thickness: 1.4,
    material: "fr4",
  })

  const cadComponents = normalized.filter(
    (el): el is CadComponent => el.type === "cad_component",
  )
  expect(
    cadComponents.map((c) => ({ x: c.position.x, y: c.position.y })),
  ).toEqual([
    { x: -11, y: 6 },
    { x: -5, y: 6 },
    { x: 5, y: 6 },
    { x: 11, y: 6 },
    { x: -11, y: -6 },
    { x: -5, y: -6 },
    { x: 5, y: -6 },
    { x: 11, y: -6 },
  ])

  const svg = await convertCircuitJsonTo3dSvg(rawCircuitJson, {
    width: 800,
    height: 600,
    camera: {
      position: { x: 0, y: -25, z: 35 },
      lookAt: { x: 0, y: 0, z: 0 },
    },
  })

  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
