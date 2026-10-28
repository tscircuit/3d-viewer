import type { AnyCircuitElement } from "circuit-json"

/** Two finite, nonparallel bends whose infinite moving half-planes overlap. */
export function createIndependentFlexTails({ fractionalTailEdge = true } = {}) {
  const center = { x: 11, y: -13 }
  const outline = [
    [-10, -10],
    [10, -10],
    [10, -7],
    [fractionalTailEdge ? 30.1234567 : 30, -7],
    [fractionalTailEdge ? 30.1234567 : 30, -3],
    [10, -3],
    [10, 3],
    [40, 3],
    [40, 7],
    [10, 7],
    [10, 10],
    [-10, 10],
  ].map(([x, y]) => ({ x: x!, y: y! }))
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center,
      width: 50,
      height: 20,
      thickness: 0.2,
      num_layers: 2,
      material: "flex",
      solder_mask_color: "#c69b32",
      // Board outlines are global; bend axes and stiffeners are board-local.
      outline: outline.map(({ x, y }) => ({
        x: x + center.x,
        y: y + center.y,
      })),
    },
    {
      type: "pcb_bend",
      pcb_bend_id: "encoder",
      pcb_board_id: "board",
      start: { x: 17, y: 3 },
      end: { x: 16, y: 7 },
      bend_radius: 2,
      bend_angle: -180,
      bend_side: "right",
    },
    {
      type: "pcb_bend",
      pcb_bend_id: "jst",
      pcb_board_id: "board",
      start: { x: 16, y: -7 },
      end: { x: 16, y: -3 },
      bend_radius: 2,
      bend_angle: -90,
      bend_side: "right",
    },
  ]
  for (const [name, x, y] of [
    ["encoder", 35, 5],
    ["jst", 27, -5],
    ["body", 0, 0],
  ] as const) {
    const position = { x: x + center.x, y: y + center.y }
    circuitJson.push(
      {
        type: "pcb_stiffener",
        pcb_stiffener_id: `${name}-stiffener`,
        pcb_board_id: "board",
        layer: "bottom",
        material: "fr4",
        thickness: 0.8,
        adhesive_thickness: 0.05,
        shape: "polygon",
        outline: [
          { x: x - 1, y: y - 1 },
          { x: x + 1, y: y - 1 },
          { x: x + 1, y: y + 1 },
          { x: x - 1, y: y + 1 },
        ],
      },
      {
        type: "source_component",
        source_component_id: name,
        name: name.toUpperCase(),
        ftype: "simple_chip",
      },
      {
        type: "pcb_component",
        pcb_component_id: name,
        source_component_id: name,
        center: position,
        width: 2,
        height: 2,
        layer: "top",
        rotation: 0,
        obstructs_within_bounds: true,
      },
      {
        type: "cad_component",
        cad_component_id: name,
        pcb_component_id: name,
        source_component_id: name,
        position: { ...position, z: 0.6 },
        rotation: { x: 0, y: 0, z: 0 },
        model_jscad: { type: "cuboid", size: [2, 2, 1] },
        model_object_fit: "contain_within_bounds",
        anchor_alignment: "center",
      },
      {
        type: "pcb_silkscreen_text",
        pcb_silkscreen_text_id: name,
        pcb_component_id: name,
        text: name.toUpperCase(),
        anchor_position: { x: position.x - 3.2, y: position.y },
        anchor_alignment: "center",
        font: "tscircuit2024",
        font_size: 0.6,
        layer: "top",
        ccw_rotation: 0,
      },
    )
  }
  return { center, outline, circuitJson }
}
