import type { AnyCircuitElement } from "circuit-json"
import { jscadPlanner as jscad, type JscadOperation } from "jscad-planner"

const { cylinder, cuboid, sphere } = jscad.primitives
const { subtract, union } = jscad.booleans
const { translate, rotateZ } = jscad.transforms
const segments = 64
const tube = (outer: number, inner: number, height: number, z: number) =>
  subtract(
    cylinder({
      radius: outer,
      height,
      center: [0, 0, z],
      resolution: segments,
    }),
    cylinder({
      radius: inner,
      height: height + 2,
      center: [0, 0, z],
      resolution: segments,
    }),
  )
const taper = (bottom: number, top: number, zBottom: number, zTop: number) =>
  jscad.hulls.hull(
    cylinder({
      radius: bottom,
      height: 0.2,
      center: [0, 0, zBottom],
      resolution: segments,
    }),
    cylinder({
      radius: top,
      height: 0.2,
      center: [0, 0, zTop],
      resolution: segments,
    }),
  )

/** Millimetres, +Z up; matches PoppyGL's reference-surface lamp. */
export const lampParts: Array<{
  name: string
  color: [number, number, number]
  position: [number, number, number]
  plan: JscadOperation
}> = [
  {
    name: "LAMP_BASE",
    color: [0.08, 0.12, 0.16],
    position: [0, 0, 0],
    plan: subtract(
      union(
        cylinder({
          radius: 34,
          height: 8,
          center: [0, 0, 4],
          resolution: segments,
        }),
        cylinder({
          radius: 24,
          height: 4,
          center: [0, 0, 10],
          resolution: segments,
        }),
      ),
      cylinder({
        radius: 2,
        height: 14,
        center: [0, 0, 6],
        resolution: segments,
      }),
      translate([17, 0, 1], cuboid({ size: [34, 4, 3] })),
    ),
  },
  {
    name: "LAMP_STEM",
    color: [0.26, 0.44, 0.55],
    position: [0, 0, 12],
    plan: tube(4, 2, 80, 40),
  },
  {
    name: "LAMP_BULB",
    color: [1, 0.9, 0.65],
    position: [0, 0, 12],
    plan: union(
      cylinder({
        radius: 2,
        height: 8,
        center: [0, 0, 84],
        resolution: segments,
      }),
      sphere({ radius: 7, center: [0, 0, 88], resolution: 32 }),
    ),
  },
  {
    name: "LAMP_SHADE",
    color: [0.85, 0.63, 0.37],
    position: [0, 0, 92],
    plan: union(
      subtract(taper(36, 20, -23.9, 19.9), taper(34.4, 17.6, -25, 21)),
      tube(7, 2.2, 4, 2),
      ...[0, 120, 240].map((angle) =>
        rotateZ(
          (angle * Math.PI) / 180,
          translate([16, 0, 2], cuboid({ size: [20, 2, 2] })),
        ),
      ),
    ),
  },
]

/** Mechanical CAD has no PCB owner, so no synthetic PCB is displayed. */
export const lampCircuitJson = lampParts.flatMap((part) => [
  {
    type: "source_component",
    source_component_id: `source_${part.name}`,
    ftype: "simple_chip",
    name: part.name,
  },
  {
    type: "cad_component",
    cad_component_id: `cad_${part.name}`,
    source_component_id: `source_${part.name}`,
    position: { x: part.position[0], y: part.position[1], z: part.position[2] },
    rotation: { x: 0, y: 0, z: 0 },
    model_jscad: jscad.colors.colorize(part.color, part.plan),
    model_unit_to_mm_scale_factor: 1,
    model_origin_position: { x: 0, y: 0, z: 0 },
  },
]) as AnyCircuitElement[]
