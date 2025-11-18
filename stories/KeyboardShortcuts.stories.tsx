import { CadViewer } from "src/CadViewer"

export const KeyboardShortcuts = () => {
  return (
    <CadViewer>
      <board width="15mm" height="10mm">
        <resistor
          name="R1"
          resistance="10k"
          footprint="0603"
          pcbX={-3}
          pcbY={0}
        />
        <pinheader name="P1" pinCount={2} pcbX={3} pcbY={0} />
      </board>
    </CadViewer>
  )
}

export const VirtualComponent = () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
    },
    {
      type: "source_component",
      source_component_id: "source_component_0",
      ftype: "simple_chip",
      name: "U1",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_0",
      center: { x: 0, y: 0 },
      width: 2,
      height: 2,
      layer: "top",
      rotation: 0,
      source_component_id: "source_component_0",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_0",
      position: { x: 0, y: 0, z: 0.7 },
      rotation: { x: 0, y: 0, z: 0 },
      pcb_component_id: "pcb_component_0",
      source_component_id: "source_component_0",
      footprinter_string: "0603",
      componentType: "virtual",
    },
  ]
  return <CadViewer circuitJson={circuitJson as any} />
}

export default {
  title: "KeyboardShortcuts",
  component: KeyboardShortcuts,
}
