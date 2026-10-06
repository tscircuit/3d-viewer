import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement, CadComponent, PcbBoard } from "circuit-json"
import type { CanvasTexture } from "three"
import soicWithTraces from "../../stories/assets/soic-with-traces.json"

// Keep the original legacy data. In particular, its four vias have from/to
// layers and no layers array or ID. This is the SSOP Rotated story's input.
export const ssopRotatedCircuit: AnyCircuitElement[] = [
  ...(soicWithTraces as unknown as AnyCircuitElement[]),
  {
    type: "cad_component",
    cad_component_id: "cad_component_1",
    pcb_component_id: "pcb_component_1",
    source_component_id: "source_component_1",
    position: { x: 0, y: 0, z: 0.7 },
    rotation: { x: 0, y: 0, z: 90 },
    model_obj_url: "/easyeda-models/47443b588a77418ba6b4ea51975c36c0",
    anchor_alignment: "center",
    model_object_fit: "contain_within_bounds",
  } satisfies CadComponent,
]

export const ssopBoard = ssopRotatedCircuit.find(
  (element): element is PcbBoard => element.type === "pcb_board",
)!

// This is an independent modern representation of the same four physical
// through vias, rather than a call to the compatibility function under test.
export const modernSsopCircuit = ssopRotatedCircuit.map((element, index) =>
  element.type === "pcb_via"
    ? { ...element, pcb_via_id: `ssop_via_${index}`, layers: ["top", "bottom"] }
    : element,
) as AnyCircuitElement[]

export function withRealCanvasDocument<T>(run: () => T): T {
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: {
      createElement: (tag: string) => {
        if (tag !== "canvas") throw new Error(`Unexpected element: ${tag}`)
        return createCanvas(1, 1)
      },
    },
  })
  try {
    return run()
  } finally {
    Object.assign(globalThis, { document: previousDocument })
  }
}

export function pixels(texture: CanvasTexture) {
  const canvas = texture.image as ReturnType<typeof createCanvas>
  return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
    .data
}

export function pixel(texture: CanvasTexture, x: number, y: number) {
  const canvas = texture.image as ReturnType<typeof createCanvas>
  return Array.from(canvas.getContext("2d").getImageData(x, y, 1, 1).data)
}
