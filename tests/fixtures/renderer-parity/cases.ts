export const comparisonCases = [
  {
    id: "clip-zero-explicit-origin",
    title: "Contact: zero rotation, explicit asset origin",
    description:
      "Positive control: original contact geometry, with origin (0,0,0) explicitly selected.",
    category: "control",
    rotation: { x: 0, y: 0, z: 0 },
    explicitOrigin: true,
    format: "obj",
  },
  {
    id: "clip-x37-explicit-origin",
    title: "Contact: +37 degrees about X",
    description:
      "Isolates the X rotation sign from inferred-origin differences.",
    category: "rotation",
    rotation: { x: 37, y: 0, z: 0 },
    explicitOrigin: true,
    format: "obj",
  },
  {
    id: "clip-y30-explicit-origin",
    title: "Contact: +30 degrees about Y",
    description:
      "An oblique Y rotation, with the original asset origin held fixed.",
    category: "rotation",
    rotation: { x: 0, y: 30, z: 0 },
    explicitOrigin: true,
    format: "obj",
  },
  {
    id: "clip-z47-explicit-origin",
    title: "Contact: +47 degrees about Z",
    description: "Positive control for the shared Z-only behavior.",
    category: "control",
    rotation: { x: 0, y: 0, z: 47 },
    explicitOrigin: true,
    format: "obj",
  },
  {
    id: "clip-mixed-explicit-origin",
    title: "Contact: mixed X/Y/Z angles",
    description:
      "Non-cardinal angles expose composition-order and sign differences.",
    category: "rotation",
    rotation: { x: 23, y: 31, z: 47 },
    explicitOrigin: true,
    format: "obj",
  },
  {
    id: "clip-zero-inferred-origin",
    title: "Contact: missing explicit origin",
    description:
      "Original alignment tags and no origin point: isolates the approximately 0.225 mm P+Y origin-policy difference.",
    category: "origin",
    rotation: { x: 0, y: 0, z: 0 },
    explicitOrigin: false,
    format: "obj",
  },
  {
    id: "clip-gltf-x37",
    title: "glTF contact: +37 degrees about X",
    description:
      "The existing glTF version of the model, exercising a different source loader.",
    category: "rotation",
    rotation: { x: 37, y: 0, z: 0 },
    explicitOrigin: true,
    format: "gltf",
  },
  {
    id: "clip-gltf-nonzero-origin",
    title: "glTF contact: explicit nonzero model origin",
    description:
      "An explicit local Y datum isolates how each consumer transforms model-origin coordinates into its rendering frame.",
    category: "origin",
    rotation: { x: 0, y: 0, z: 0 },
    explicitOrigin: true,
    origin: { x: 0, y: -0.5, z: 0 },
    format: "gltf",
  },
  {
    id: "clip-gltf-implicit-bottom",
    title: "glTF contact: implicit bottom-layer orientation",
    description:
      "Bottom-side CAD with no rotation field: compares the renderers' existing fallback orientations.",
    category: "rotation",
    rotation: undefined,
    explicitOrigin: true,
    layer: "bottom",
    format: "gltf",
  },
  {
    id: "clip-glb-via-gltf",
    title: "Binary GLB through gltfUrl",
    description:
      "Preserves the existing GLB story's model_gltf_url selection. Any exporter JSON/binary dispatch failure is reported, never replaced with geometry.",
    category: "format",
    rotation: { x: 37, y: 0, z: 0 },
    explicitOrigin: false,
    format: "glb-via-gltf",
  },
  {
    id: "usb-mounted",
    title: "MICRO_XNJ_ZB: seated mounting fixture",
    description:
      "Native Z-up USB model turned -90 degrees about Z, with an explicit measured datum. The two fixture slots are turned 90 degrees to accept the metal tabs. Renderer behavior is unchanged.",
    category: "real",
    rotation: { x: 0, y: 0, z: 270 },
    position: { x: 1.3824742, y: 0, z: 1.975 },
    physicalMount: true,
    explicitOrigin: true,
    format: "usb",
  },
  {
    id: "usb-zero",
    title: "MICRO_XNJ_ZB: original missing-origin probe",
    description:
      "Historical zero-angle input retaining its original datum and slots. This is a separate origin-policy diagnostic, not the seated fixture.",
    category: "origin",
    rotation: { x: 0, y: 0, z: 0 },
    explicitOrigin: false,
    format: "usb",
  },
  {
    id: "calibration",
    title: "Matcher calibration: one viewer, deliberate mutations",
    description:
      "The browser calibration compares identical viewer geometry and deliberately shifted, sign-reversed, and wrong-order copies. It does not change either renderer.",
    category: "control",
    rotation: { x: 23, y: 31, z: 47 },
    explicitOrigin: true,
    format: "obj",
  },
] as const
