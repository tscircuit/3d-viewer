import { CadViewer } from "src/CadViewer"

export default {
  title: "Panel",
  component: CadViewer,
}

// Test 1: Simple 2x2 Grid with Rectangular Boards
export const Panel2x2Grid = () => {
  const circuitJson = [
    {
      type: "pcb_panel",
      pcb_panel_id: "panel_0",
      width: 100,
      height: 100,
    },
    // Top-left board
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: -25, y: 25 },
      width: 40,
      height: 40,
      thickness: 1.6,
      material: "fr4",
      num_layers: 2,
    },
    // Top-right board
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 25, y: 25 },
      width: 40,
      height: 40,
      thickness: 1.6,
      material: "fr4",
      num_layers: 2,
    },
    // Bottom-left board
    {
      type: "pcb_board",
      pcb_board_id: "board_2",
      center: { x: -25, y: -25 },
      width: 40,
      height: 40,
      thickness: 1.6,
      material: "fr4",
      num_layers: 2,
    },
    // Bottom-right board
    {
      type: "pcb_board",
      pcb_board_id: "board_3",
      center: { x: 25, y: -25 },
      width: 40,
      height: 40,
      thickness: 1.6,
      material: "fr4",
      num_layers: 2,
    },
  ]

  return <CadViewer circuitJson={circuitJson as any} />
}

// Test 2: Panel with Polygon Board Outline (Star Shape)
export const PanelWithStarOutlines = () => {
  const starOutline = [
    { x: 0, y: 10 },
    { x: 2.5, y: 7.5 },
    { x: 7.5, y: 6 },
    { x: 4, y: 2.5 },
    { x: 5, y: -3 },
    { x: 0, y: -1 },
    { x: -5, y: -3 },
    { x: -4, y: 2.5 },
    { x: -7.5, y: 6 },
    { x: -2.5, y: 7.5 },
  ]

  const circuitJson = [
    {
      type: "pcb_panel",
      pcb_panel_id: "panel_0",
      width: 80,
      height: 40,
    },
    // Left star
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: -20, y: 0 },
      outline: starOutline,
      thickness: 1.6,
      material: "fr4",
      num_layers: 2,
    },
    // Right star
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 20, y: 0 },
      outline: starOutline,
      thickness: 1.6,
      material: "fr4",
      num_layers: 2,
    },
  ]

  return <CadViewer circuitJson={circuitJson as any} />
}

// Test 3: Mixed rectangular and polygon boards
export const PanelMixedShapes = () => {
  const hexOutline = [
    { x: 8, y: 0 },
    { x: 4, y: 7 },
    { x: -4, y: 7 },
    { x: -8, y: 0 },
    { x: -4, y: -7 },
    { x: 4, y: -7 },
  ]

  const circuitJson = [
    {
      type: "pcb_panel",
      pcb_panel_id: "panel_0",
      width: 120,
      height: 50,
    },
    // Rectangular board
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: -35, y: 0 },
      width: 35,
      height: 30,
      thickness: 1.6,
      material: "fr4",
      num_layers: 2,
    },
    // Hexagonal board
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 10, y: 0 },
      outline: hexOutline,
      thickness: 1.6,
      material: "fr4",
      num_layers: 2,
    },
    // Another rectangular board
    {
      type: "pcb_board",
      pcb_board_id: "board_2",
      center: { x: 45, y: 0 },
      width: 25,
      height: 35,
      thickness: 1.6,
      material: "fr4",
      num_layers: 2,
    },
  ]

  return <CadViewer circuitJson={circuitJson as any} />
}

// Test 4: Single board in panel
export const PanelSingleBoard = () => {
  const circuitJson = [
    {
      type: "pcb_panel",
      pcb_panel_id: "panel_0",
      width: 80,
      height: 60,
    },
    {
      type: "pcb_board",
      pcb_board_id: "board_0",
      center: { x: 0, y: 0 },
      width: 50,
      height: 40,
      thickness: 1.6,
      material: "fr4",
      num_layers: 2,
    },
  ]

  return <CadViewer circuitJson={circuitJson as any} />
}
