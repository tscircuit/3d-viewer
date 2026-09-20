import type { ComparisonCase } from "./types"

const circuitDir = "tests/fixtures/renderer-parity/circuits"
const uprightTo92 = {
  correctRenderer: "viewer",
  correct:
    "The transistor body is above the PCB and all three leads pass through their plated holes.",
  incorrect:
    "The transistor is inverted or sideways: its body intersects or hangs below the PCB instead of sitting above the holes.",
} as const

export const comparisonCases: readonly ComparisonCase[] = [
  {
    id: "to92-x-mounting",
    title: "TO-92: mounting a source model turned about X",
    description:
      "The real TO-92 source geometry is rigidly rotated -90 degrees about X. The TSX's +90-degree rotationOffset must restore the upright mounting pose.",
    category: "rotation",
    sourceFile: `${circuitDir}/to92-x.circuit.tsx`,
    targetName: "Q1",
    physicalExpectation: uprightTo92,
    camera: { target: [1.27, 0, 0.7], span: 18 },
  },
  {
    id: "to92-y-mounting",
    title: "TO-92: mounting a source model turned about Y",
    description:
      "The same real part is exported with its source geometry rotated -90 degrees about Y. The authored +90-degree correction must put its leads through the actual footprint.",
    category: "rotation",
    sourceFile: `${circuitDir}/to92-y.circuit.tsx`,
    targetName: "Q1",
    physicalExpectation: uprightTo92,
    camera: { target: [1.27, 0, 0.7], span: 18 },
  },
  {
    id: "to92-xy-mounting",
    title: "TO-92: composing X and Y mounting corrections",
    description:
      "The source export uses Ry(-90) * Rx(-90). The TSX correction Rx(90) * Ry(90) restores the real package; reversing the composition leaves it on its side.",
    category: "rotation",
    sourceFile: `${circuitDir}/to92-xy.circuit.tsx`,
    targetName: "Q1",
    physicalExpectation: uprightTo92,
    camera: { target: [1.27, 0, 0.7], span: 18 },
  },
  {
    id: "to92-native-origin",
    title: "TO-92 STEP: original missing origin",
    description:
      "A normal TSX part with the original KiCad STEP asset and no authored model origin. Check all three metal leads against the three plated holes.",
    category: "origin",
    sourceFile: `${circuitDir}/to92-origin.circuit.tsx`,
    targetName: "Q1",
    physicalExpectation: {
      correctRenderer: "exporter",
      correct: "All three leads are centered in their plated holes.",
      incorrect:
        "The leads are shifted by one 1.27 mm pin pitch; one hole is left empty.",
    },
    camera: { target: [1.27, 0, 3], span: 14 },
  },
  {
    id: "flashlight-native-origins",
    title: "USB-C flashlight: original missing origins",
    description:
      "A TSX-authored flashlight board using the real C165948 USB-C model and its actual pads and mounting holes, without an added origin override.",
    category: "origin",
    sourceFile: `${circuitDir}/flashlight-origin.circuit.tsx`,
    targetName: "J1",
    physicalExpectation: {
      correctRenderer: "viewer",
      correct:
        "The USB connector's mounting tabs meet the holes and its contacts sit on the pad row.",
      incorrect:
        "The inferred origin shifts the connector away from its mounting holes and pads.",
    },
    camera: { target: [0, 0, 0], span: 42 },
  },
  {
    id: "calibration",
    title: "Comparator calibration (not a renderer correctness example)",
    description:
      "Identical copies of the physically mounted compound-rotation TO-92, then deliberate test-only mutations. This is kept separate from the reviewer-facing repros.",
    category: "control",
    sourceFile: `${circuitDir}/to92-xy.circuit.tsx`,
    targetName: "Q1",
    camera: { target: [1.27, 0, 3], span: 14 },
  },
]
