import { CadViewer } from "src/CadViewer"

const createSoldermaskCircuit = (solderMaskColor: string) => [
  {
    type: "pcb_board",
    pcb_board_id: `board-${solderMaskColor}`,
    center: { x: 0, y: 0 },
    width: 24,
    height: 18,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    solder_mask_color: solderMaskColor,
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace-1",
    route: [
      { route_type: "wire", x: -8, y: 0, width: 0.7, layer: "top" },
      { route_type: "wire", x: 8, y: 0, width: 0.7, layer: "top" },
    ],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad-1",
    shape: "rect",
    x: -8,
    y: 0,
    width: 3,
    height: 2,
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad-2",
    shape: "rect",
    x: 8,
    y: 0,
    width: 3,
    height: 2,
    layer: "top",
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "label",
    text: solderMaskColor.toUpperCase(),
    layer: "top",
    anchor_position: { x: 0, y: 5 },
    anchor_alignment: "center",
    font_size: 1.5,
    font: "tscircuit2024",
  },
]

const SoldermaskColor = ({ color }: { color: string }) => (
  <CadViewer circuitJson={createSoldermaskCircuit(color) as any} />
)

export const Green = () => <SoldermaskColor color="green" />
export const Blue = () => <SoldermaskColor color="blue" />
export const Yellow = () => <SoldermaskColor color="yellow" />
export const White = () => <SoldermaskColor color="white" />
export const Red = () => <SoldermaskColor color="red" />
export const Black = () => <SoldermaskColor color="black" />
export const Purple = () => <SoldermaskColor color="purple" />
export const CustomHex = () => <SoldermaskColor color="#b03060" />

export default {
  title: "Soldermask Colors",
  component: SoldermaskColor,
}
