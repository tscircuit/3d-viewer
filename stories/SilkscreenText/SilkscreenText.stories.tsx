import { CadViewer } from "src/CadViewer"
import { Circuit } from "@tscircuit/core"

const createCircuit = () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="10mm" height="10mm">
      <footprint>
        <silkscreentext
          text="bottom_L"
          pcbX={0}
          pcbY={0}
          anchorAlignment="bottom_left"
          pcbRotation={0}
          layer="top"
          fontSize={0.25}
        />
        <silkscreentext
          text="top_L"
          pcbX={0}
          pcbY={0}
          anchorAlignment="top_left"
          pcbRotation={0}
          layer="top"
          fontSize={0.25}
        />
        <silkscreentext
          text="bottom_R"
          pcbX={0}
          pcbY={0}
          anchorAlignment="bottom_right"
          pcbRotation={0}
          layer="top"
          fontSize={0.25}
        />
        <silkscreentext
          text="top_R"
          pcbX={0}
          pcbY={0}
          anchorAlignment="top_right"
          pcbRotation={0}
          layer="top"
          fontSize={0.25}
        />
        <silkscreentext
          text="center"
          pcbX={0}
          pcbY={1}
          anchorAlignment="center"
          pcbRotation={0}
          layer="bottom"
          fontSize={0.25}
        />
      </footprint>
    </board>,
  )

  return circuit.getCircuitJson()
}

export const SilkscreenText = () => {
  const circuitJson = createCircuit()
  return <CadViewer circuitJson={circuitJson as any} />
}
export const SilkscreenTextFontSize = () => {
  return (
    <CadViewer
      circuitJson={[
        {
          type: "pcb_board",
          center: { x: 0, y: 0 },
          width: 10,
          height: 10,
          subcircuit_id: "pcb_generic_component_0",
          material: "fr4",
          num_layers: 2,
          pcb_board_id: "pcb_board_0",
          thickness: 1,
          is_subcircuit: false,
        },
        {
          type: "pcb_silkscreen_text",
          layer: "top",
          pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
          font: "tscircuit2024",
          font_size: 1,
          pcb_component_id: "pcb_generic_component_0",
          anchor_position: { x: 0, y: 0 },
          anchor_alignment: "bottom_center",
          text: "FONT SIZE TEST",
        },
        {
          type: "pcb_silkscreen_text",
          layer: "top",
          pcb_silkscreen_text_id: "pcb_silkscreen_text_0",
          font: "tscircuit2024",
          font_size: 0.5,
          pcb_component_id: "pcb_generic_component_0",
          anchor_position: { x: 0, y: 2 },
          anchor_alignment: "bottom_center",
          text: "FONT SIZE TEST",
        },
        {
          type: "pcb_smtpad",
          layer: "top",
          pcb_smtpad_id: "pcb_smtpad_0",
          pcb_component_id: "pcb_generic_component_0",
          width: 1,
          height: 1,
          x: 4.55,
          y: 0.5,
          shape: "rect",
        },
        {
          type: "pcb_smtpad",
          layer: "top",
          pcb_smtpad_id: "pcb_smtpad_0",
          pcb_component_id: "pcb_generic_component_0",
          width: 1,
          height: 1,
          x: -4.55,
          y: 0.5,
          shape: "rect",
        },
        {
          type: "pcb_smtpad",
          layer: "top",
          pcb_smtpad_id: "pcb_smtpad_0",
          pcb_component_id: "pcb_generic_component_0",
          width: 1,
          height: 1,
          x: -2.55,
          y: 2.5,
          shape: "rect",
        },
        {
          type: "pcb_smtpad",
          layer: "top",
          pcb_smtpad_id: "pcb_smtpad_0",
          pcb_component_id: "pcb_generic_component_0",
          width: 1,
          height: 1,
          x: 2.55,
          y: 2.5,
          shape: "rect",
        },
      ]}
    />
  )
}

export default {
  title: "Silkscreen Text",
  component: SilkscreenText,
}
