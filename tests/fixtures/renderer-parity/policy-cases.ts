export const policyCases = [
  {
    id: "to92-native-origin",
    title: "TO-92 STEP: original missing origin",
    description:
      "Original regression input, without an authored datum. Compare the metal pins with the centered footprint: renderer agreement alone does not establish correct mounting.",
    category: "origin",
    seed: "policy/to92.circuit.json",
    camera: { target: [0, 0, 3], span: 18 },
  },
  {
    id: "to92-explicit-midpoint",
    title: "TO-92 STEP: explicit contact midpoint",
    description:
      "Control differing only by model_origin_position=(1.27,0,0), the native contact midpoint. This makes the datum choice explicit in both rendering paths.",
    category: "origin",
    seed: "policy/to92.circuit.json",
    origin: { x: 1.27, y: 0, z: 0 },
    camera: { target: [0, 0, 3], span: 18 },
  },
  {
    id: "flashlight-native-origins",
    title: "USB-C flashlight: original missing origins",
    description:
      "Original flashlight Circuit JSON and placement fields. The normal views show the whole board; the geometry pass isolates the USB connector. No inferred or explicit datums are added.",
    category: "origin",
    seed: "policy/flashlight.circuit.json",
    camera: { target: [0, 0, 0], span: 42 },
  },
  {
    id: "soic-gltf-omitted-position",
    title: "SOIC8 glTF: original omitted position",
    description:
      "Original sparse fixture: CAD position, rotation, source association and board thickness remain omitted. Neither a raised position nor a source ID is injected by this comparison.",
    category: "position",
    seed: "policy/soic-gltf.circuit.json",
    exportTargetNodeIndex: 1,
    camera: { target: [0, 0, 0.8], span: 11 },
  },
  {
    id: "soic-gltf-explicit-position",
    title: "SOIC8 glTF: explicit raised-position control",
    description:
      "Only CAD position=(0,0,1.8) is added, explicitly reproducing the old exporter's raised-position fallback. This is a placement-policy control, not a claim that the height is physically correct.",
    category: "position",
    seed: "policy/soic-gltf.circuit.json",
    position: { x: 0, y: 0, z: 1.8 },
    exportTargetNodeIndex: 1,
    camera: { target: [0, 0, 0.8], span: 11 },
  },
  {
    id: "soic-footprinter-omitted-position",
    title: "SOIC8 footprinter: original omitted position",
    description:
      "Original generated-model fixture with CAD position omitted. This uses the actual FootprinterModel branch, not a replacement GLTF model.",
    category: "position",
    seed: "policy/soic-footprinter.circuit.json",
    exportTargetNodeIndex: 1,
    camera: { target: [0, 0, 0.8], span: 11 },
  },
  {
    id: "soic-footprinter-explicit-position",
    title: "SOIC8 footprinter: explicit raised-position control",
    description:
      "Only CAD position=(0,0,1.8) is added to the original footprinter input. Compare with the omitted-position story using the same fixed cameras.",
    category: "position",
    seed: "policy/soic-footprinter.circuit.json",
    position: { x: 0, y: 0, z: 1.8 },
    exportTargetNodeIndex: 1,
    camera: { target: [0, 0, 0.8], span: 11 },
  },
  {
    id: "scale-fit-original-stl",
    title: "Unit scale and fit: original STL input",
    description:
      "Original boardless STL unit test: model_unit_to_mm_scale_factor=2 and target size=(1,1,1). Viewer faux-board preprocessing and any actual STL loading failure remain visible; no substitute geometry is used.",
    category: "scale",
    seed: "policy/scale-fit.circuit.json",
    exportTargetNodeIndex: 0,
    camera: { target: [0, 0, 0.5], span: 5 },
  },
  {
    id: "scale-fit-obj-control",
    title: "Unit scale and fit: equivalent OBJ control",
    description:
      "Decoder-independent control with the same triangle geometry encoded as OBJ, an explicit shared 4x4x1.6 mm board and CAD Z=0.8. Unit scale=2 and target size=(1,1,1) are unchanged, isolating size-fitting policy from STL loading and faux-board preprocessing.",
    category: "scale",
    seed: "policy/scale-fit.circuit.json",
    commonScaleControl: true,
    exportTargetNodeIndex: 1,
    camera: { target: [0, 0, 0.8], span: 5 },
  },
] as const
