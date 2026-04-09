import { Circuit } from "@tscircuit/core"
import { CadViewer } from "src/CadViewer"

const pcbNotesCircuit = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_1",
    center: { x: 0, y: 0 },
    width: 20,
    height: 12,
    thickness: 1,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_1",
    center: { x: 0, y: 0 },
    width: 0,
    height: 0,
    rotation: 0,
    layer: "top",
    obstructs_within_bounds: false,
    do_not_place: true,
  },
  // pcb_note_rect — filled cyan rectangle
  {
    type: "pcb_note_rect",
    pcb_note_rect_id: "note_rect_1",
    pcb_component_id: "pcb_component_1",
    pcb_group_id: "group1",
    subcircuit_id: "subcircuit1",
    name: "Outline",
    text: "Component area",
    center: { x: -5, y: 3 },
    width: "4mm",
    height: "3mm",
    stroke_width: "0.15mm",
    corner_radius: "0.4mm",
    is_filled: true,
    has_stroke: true,
    color: "#00FFFF",
    layer: "top",
  },
  // pcb_note_rect — dashed stroke
  {
    type: "pcb_note_rect",
    pcb_note_rect_id: "note_rect_2",
    pcb_component_id: "pcb_component_1",
    pcb_group_id: "group1",
    subcircuit_id: "subcircuit1",
    name: "Keepout",
    text: "Keepout zone",
    center: { x: -5, y: -2 },
    width: "5mm",
    height: "2mm",
    stroke_width: "0.15mm",
    is_filled: false,
    has_stroke: true,
    is_stroke_dashed: true,
    color: "#FF6B6B",
    layer: "top",
  },
  // pcb_note_line — solid
  {
    type: "pcb_note_line",
    pcb_note_line_id: "note_line_1",
    pcb_component_id: "pcb_component_1",
    x1: "0mm",
    y1: "4mm",
    x2: "6mm",
    y2: "4mm",
    stroke_width: "0.15mm",
    layer: "top",
    color: "#E67E22",
  },
  // pcb_note_line — dashed
  {
    type: "pcb_note_line",
    pcb_note_line_id: "note_line_2",
    pcb_component_id: "pcb_component_1",
    x1: "0mm",
    y1: "2.5mm",
    x2: "6mm",
    y2: "2.5mm",
    stroke_width: "0.15mm",
    layer: "top",
    is_dashed: true,
    color: "#3498DB",
  },
  // pcb_note_text
  {
    type: "pcb_note_text",
    pcb_note_text_id: "note_text_1",
    pcb_component_id: "pcb_component_1",
    text: "PCB NOTES",
    anchor_position: { x: "1mm", y: "0mm" },
    anchor_alignment: "top_left",
    font_size: "1.2mm",
    layer: "top",
    color: "#FFFFFF",
  },
  // pcb_note_path — triangle
  {
    type: "pcb_note_path",
    pcb_note_path_id: "note_path_1",
    pcb_component_id: "pcb_component_1",
    route: [
      { x: "2mm", y: "-2mm" },
      { x: "5mm", y: "-4mm" },
      { x: "2mm", y: "-4mm" },
      { x: "2mm", y: "-2mm" },
    ],
    stroke_width: "0.12mm",
    layer: "top",
    color: "#9B59B6",
  },
  // pcb_note_dimension
  {
    type: "pcb_note_dimension",
    pcb_note_dimension_id: "note_dim_1",
    pcb_component_id: "pcb_component_1",
    from: { x: "6mm", y: "-1mm" },
    to: { x: "6mm", y: "-4mm" },
    font_size: "0.8mm",
    arrow_size: "0.5mm",
    offset_distance: "1mm",
    layer: "top",
    color: "#2ECC71",
  },
]

export const PcbNotesToggle = () => (
  <CadViewer circuitJson={pcbNotesCircuit as any} />
)

const createPcbNoteAllElementsCircuit = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="20mm" height="12mm">
      {/* pcb_note_rect — filled with corner radius */}
      <pcbnoterect
        pcbX={-5}
        pcbY={3}
        width="4mm"
        height="2.5mm"
        strokeWidth={0.1}
        color="#00FFFF"
      />
      {/* pcb_note_rect — dashed stroke only */}
      <pcbnoterect
        pcbX={-5}
        pcbY={-2}
        width="5mm"
        height="2mm"
        strokeWidth={0.1}
        color="#FF6B6B"
      />
      {/* pcb_note_text */}
      <pcbnotetext
        pcbX={1}
        pcbY={0}
        text="PCB NOTES"
        fontSize="1.2mm"
        color="#FFFFFF"
      />
      {/* pcb_note_line — solid */}
      <pcbnoteline
        x1={0}
        y1={4}
        x2={6}
        y2={4}
        strokeWidth={0.15}
        color="#E67E22"
      />
      {/* pcb_note_line — dashed */}
      <pcbnoteline
        x1={0}
        y1={2.5}
        x2={6}
        y2={2.5}
        strokeWidth={0.15}
        color="#3498DB"
        isDashed
      />
      {/* pcb_note_path — triangle */}
      <pcbnotepath
        route={[
          { x: 2, y: -2 },
          { x: 5, y: -4 },
          { x: 2, y: -4 },
          { x: 2, y: -2 },
        ]}
        strokeWidth={0.12}
        color="#9B59B6"
      />
      {/* pcb_note_dimension */}
      <pcbnotedimension
        from={{ x: 6, y: -1 }}
        to={{ x: 6, y: -4 }}
        fontSize="0.8mm"
        arrowSize="0.5mm"
        offset="1mm"
        color="#2ECC71"
      />
    </board>,
  )

  return circuit.getCircuitJson()
}

export const PcbNoteAllElements = () => (
  <CadViewer circuitJson={createPcbNoteAllElementsCircuit() as any} />
)

export default {
  title: "PCB Notes Toggle",
  component: PcbNotesToggle,
}
