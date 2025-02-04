import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useState } from "react"
import { CadViewer } from "src/CadViewer"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "source_component",
    source_component_id: "simple_resistor_0",
    name: "R2",
    supplier_part_numbers: {},
    ftype: "simple_resistor",
    resistance: 100,
  },
  {
    type: "schematic_component",
    source_component_id: "simple_resistor_0",
    schematic_component_id: "schematic_component_simple_resistor_0",
    rotation: 1.5707963267948966,
    size: {
      width: 1,
      height: 0.3,
    },
    center: {
      x: 0,
      y: 2,
    },
  },
  {
    type: "source_port",
    name: "left",
    source_port_id: "source_port_0",
    source_component_id: "simple_resistor_0",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_0",
    source_port_id: "source_port_0",
    center: {
      x: -3.061616997868383e-17,
      y: 1.5,
    },
    facing_direction: "down",
    schematic_component_id: "schematic_component_simple_resistor_0",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_0",
    source_port_id: "source_port_0",
    pcb_component_id: "pcb_component_simple_resistor_0",
    x: -0.95,
    y: 0,
    layers: ["top"],
  },
  {
    type: "source_port",
    name: "right",
    source_port_id: "source_port_1",
    source_component_id: "simple_resistor_0",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_1",
    source_port_id: "source_port_1",
    center: {
      x: 3.061616997868383e-17,
      y: 2.5,
    },
    facing_direction: "up",
    schematic_component_id: "schematic_component_simple_resistor_0",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_1",
    source_port_id: "source_port_1",
    pcb_component_id: "pcb_component_simple_resistor_0",
    x: 0.95,
    y: 0,
    layers: ["top"],
  },
  {
    type: "schematic_text",
    text: "R2",
    schematic_text_id: "schematic_text_0",
    schematic_component_id: "schematic_component_simple_resistor_0",
    anchor: "left",
    position: {
      x: 0.3,
      y: 1.8,
    },
    rotation: 0,
    color: "black",
  },
  {
    type: "schematic_text",
    text: "100",
    schematic_text_id: "schematic_text_1",
    schematic_component_id: "schematic_component_simple_resistor_0",
    anchor: "left",
    position: {
      x: 0.3,
      y: 2,
    },
    rotation: 0,
    color: "black",
  },
  {
    type: "pcb_component",
    source_component_id: "simple_resistor_0",
    pcb_component_id: "pcb_component_simple_resistor_0",
    layer: "top",
    center: {
      x: 0,
      y: 0,
    },
    rotation: 0,
    width: 3.0999999999999996,
    height: 1.2,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_0",
    shape: "rect",
    x: -0.95,
    y: 0,
    width: 1.2,
    height: 1.2,
    layer: "top",
    pcb_component_id: "pcb_component_simple_resistor_0",
    port_hints: ["1", "left"],
    pcb_port_id: "pcb_port_0",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_2",
    shape: "rect",
    x: 0.95,
    y: 0,
    width: 1.2,
    height: 1.2,
    layer: "top",
    pcb_component_id: "pcb_component_simple_resistor_0",
    port_hints: ["2", "right"],
    pcb_port_id: "pcb_port_1",
  },
  {
    type: "cad_component",
    cad_component_id: "cad_component_0",
    source_component_id: "simple_resistor_0",
    pcb_component_id: "pcb_component_simple_resistor_0",
    position: {
      x: 0,
      y: 0,
      z: 0.6,
    },
    rotation: {
      x: 0,
      y: 0,
      z: 90,
    },
    layer: "top",
    model_obj_url:
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=c7acac53bcbc44d68fbab8f60a747688&pn=C17414",
  },
  {
    type: "source_component",
    source_component_id: "simple_resistor_1",
    name: "R1",
    supplier_part_numbers: {},
    ftype: "simple_resistor",
    resistance: 1000,
    // rotation: 90, // Removed as it's not a valid property for source_component
  },
  {
    type: "schematic_component",
    source_component_id: "simple_resistor_1",
    schematic_component_id: "schematic_component_simple_resistor_1",
    rotation: 0,
    size: {
      width: 1,
      height: 0.3,
    },
    center: {
      x: 0,
      y: 0,
    },
  },
  {
    type: "source_port",
    name: "left",
    source_port_id: "source_port_2",
    source_component_id: "simple_resistor_1",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_2",
    source_port_id: "source_port_2",
    center: {
      x: -0.5,
      y: 0,
    },
    facing_direction: "left",
    schematic_component_id: "schematic_component_simple_resistor_1",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_2",
    source_port_id: "source_port_2",
    pcb_component_id: "pcb_component_simple_resistor_1",
    x: 2,
    y: 1.05,
    layers: ["top"],
  },
  {
    type: "source_port",
    name: "right",
    source_port_id: "source_port_3",
    source_component_id: "simple_resistor_1",
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_3",
    source_port_id: "source_port_3",
    center: {
      x: 0.5,
      y: 0,
    },
    facing_direction: "right",
    schematic_component_id: "schematic_component_simple_resistor_1",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_3",
    source_port_id: "source_port_3",
    pcb_component_id: "pcb_component_simple_resistor_1",
    x: 2,
    y: 2.95,
    layers: ["top"],
  },
  {
    type: "schematic_text",
    text: "R1",
    schematic_text_id: "schematic_text_2",
    schematic_component_id: "schematic_component_simple_resistor_1",
    anchor: "left",
    position: {
      x: -0.2,
      y: -0.5,
    },
    rotation: 0,
    color: "black",
  },
  {
    type: "schematic_text",
    text: "1000",
    schematic_text_id: "schematic_text_3",
    schematic_component_id: "schematic_component_simple_resistor_1",
    anchor: "left",
    position: {
      x: -0.2,
      y: -0.3,
    },
    rotation: 0,
    color: "black",
  },
  {
    type: "pcb_component",
    source_component_id: "simple_resistor_1",
    pcb_component_id: "pcb_component_simple_resistor_1",
    layer: "top",
    center: {
      x: 2,
      y: 2,
    },
    rotation: 1.5707963267948966,
    width: 1.2000000000000002,
    height: 3.1,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_1",
    shape: "rect",
    x: 2,
    y: 1.05,
    width: 1.2,
    height: 1.2,
    layer: "top",
    pcb_component_id: "pcb_component_simple_resistor_1",
    port_hints: ["1", "left"],
    pcb_port_id: "pcb_port_2",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_3",
    shape: "rect",
    x: 2,
    y: 2.95,
    width: 1.2,
    height: 1.2,
    layer: "top",
    pcb_component_id: "pcb_component_simple_resistor_1",
    port_hints: ["2", "right"],
    pcb_port_id: "pcb_port_3",
  },
  {
    type: "cad_component",
    cad_component_id: "cad_component_1",
    source_component_id: "simple_resistor_1",
    pcb_component_id: "pcb_component_simple_resistor_1",
    position: {
      x: 2,
      y: 2,
      z: 0.6,
    },
    rotation: {
      x: 0,
      y: 0,
      z: 90,
    },
    layer: "top",
    model_obj_url:
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=c7acac53bcbc44d68fbab8f60a747688&pn=C17414",
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_0",
    connected_source_port_ids: ["source_port_2", "source_port_1"],
    connected_source_net_ids: [],
  },
  {
    type: "schematic_trace",
    source_trace_id: "source_trace_0",
    schematic_trace_id: "schematic_trace_0",
    junctions: [{ x: 5, y: 5 }],
    edges: [
      {
        from: {
          x: -0.6000000000000001,
          y: 0,
        },
        to: {
          x: -0.6000000000000001,
          y: 2.3000000000000003,
        },
      },
      {
        from: {
          x: -0.6000000000000001,
          y: 2.3000000000000003,
        },
        to: {
          x: 0,
          y: 2.3000000000000003,
        },
      },
      {
        from: {
          x: 0,
          y: 2.3000000000000003,
        },
        to: {
          x: 0,
          y: 2.7,
        },
      },
      {
        from: {
          x: -0.5,
          y: 0,
          // ti: 0,
        },
        to: {
          x: -0.6000000000000001,
          y: 0,
        },
      },
      {
        from: {
          x: 3.061616997868383e-17,
          y: 2.5,
          // ti: 1,
        },
        to: {
          x: 0,
          y: 2.7,
        },
      },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_0",
    source_trace_id: "source_trace_0",
    route: [
      {
        route_type: "wire",
        layer: "top",
        width: 0.2,
        x: 1,
        y: 0,
      },
      {
        route_type: "wire",
        layer: "top",
        width: 0.2,
        x: 2,
        y: 1,
      },
    ],
  },
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: {
      x: 0,
      y: 0,
    },
    width: 10,
    height: 10,
    thickness: 1.6,
    num_layers: 2,
  },
]

export const Default = () => {
  const [copiedSoup, setCopiedSoup] = useState(circuitJson)
  // SIMULATE: every 1000ms, copy the soup and reset it to trigger a re-render
  // useEffect(() => {
  //   const timer = setInterval(async () => {
  //     setCopiedSoup([])
  //     await new Promise((resolve) => setTimeout(resolve, 100))
  //     setCopiedSoup(JSON.parse(JSON.stringify(soup)))
  //   }, 1000)
  //   return () => clearTimeout(timer)
  // }, [])
  return <CadViewer circuitJson={copiedSoup} />
}

export default {
  title: "Bugs/Rotation Offsets",
  component: Default,
}
