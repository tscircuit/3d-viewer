import type { ComparisonCase } from "./types"

const circuitDir = "tests/fixtures/renderer-parity/circuits"
export const comparisonCases: readonly ComparisonCase[] = [
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
      "An unmodified STEP in a deliberately arbitrary pose, copied twice before test-only mutations. This checks comparator sensitivity, not physical mounting correctness.",
    category: "control",
    sourceFile: `${circuitDir}/comparator-calibration.circuit.tsx`,
    targetName: "Q1",
    camera: { target: [1.27, 0, 3], span: 14 },
  },
]
