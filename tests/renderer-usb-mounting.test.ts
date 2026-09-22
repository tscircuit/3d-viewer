import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbPlatedHole } from "circuit-json"
import { Euler, Line3, MathUtils, Mesh, Plane, Vector3 } from "three"
import { OBJLoader } from "three-stdlib"
import { applyComparisonCase } from "./fixtures/renderer-parity/apply-case"
import { comparisonCases } from "./fixtures/renderer-parity/cases"

function holeClearance(point: Vector3, hole: PcbPlatedHole) {
  const local = new Vector3(point.x - hole.x, point.y - hole.y, 0)
  if (hole.shape === "circle") {
    if (!hole.hole_diameter) throw new Error("Missing circular-hole diameter")
    return local.length() - hole.hole_diameter / 2
  }
  if (hole.shape !== "pill" || !hole.hole_width || !hole.hole_height)
    throw new Error("Expected a dimensioned mounting slot")
  local.applyAxisAngle(
    new Vector3(0, 0, 1),
    -MathUtils.degToRad(hole.ccw_rotation ?? 0),
  )
  const radius = Math.min(hole.hole_width, hole.hole_height) / 2
  const halfLine = Math.abs(hole.hole_width - hole.hole_height) / 2
  const end =
    hole.hole_width > hole.hole_height
      ? new Vector3(halfLine, 0, 0)
      : new Vector3(0, halfLine, 0)
  const centerline = new Line3(end.clone().negate(), end)
  return (
    local.distanceTo(
      centerline.closestPointToPoint(local, true, new Vector3()),
    ) - radius
  )
}

test("the USB mounting fixture seats all four shell tabs and five contacts without changing the captured seed", async () => {
  const fixture = comparisonCases.find((entry) => entry.id === "usb-mounted")
  if (!fixture) throw new Error("Missing USB mounting fixture")
  const seed: AnyCircuitElement[] = await Bun.file(
    `${import.meta.dir}/fixtures/renderer-parity/usb.circuit.json`,
  ).json()
  const original = structuredClone(seed)
  const { circuit, target } = applyComparisonCase(seed, fixture)
  expect(seed).toEqual(original)
  expect(target.model_origin_position).toEqual({ x: 0, y: 0, z: 0 })
  if (!target.rotation) throw new Error("Missing mounting rotation")
  const rotation = new Euler(
    MathUtils.degToRad(target.rotation.x),
    MathUtils.degToRad(target.rotation.y),
    MathUtils.degToRad(target.rotation.z),
    "XYZ",
  )
  const position = new Vector3(
    target.position.x,
    target.position.y,
    target.position.z,
  )
  const board = circuit.find((element) => element.type === "pcb_board")
  if (!board) throw new Error("Missing reference board")
  const top = board.thickness / 2
  const bottom = -top
  const holes = circuit.filter((element) => element.type === "pcb_plated_hole")
  const pads = circuit.filter((element) => element.type === "pcb_smtpad")
  expect(holes).toHaveLength(4)
  expect(pads).toHaveLength(5)
  const planes = [
    new Plane(new Vector3(0, 0, 1), -top),
    new Plane(new Vector3(0, 0, 1), -bottom),
  ]
  const text = await Bun.file(
    `${import.meta.dir}/fixtures/renderer-parity/assets/micro-xnj-zb.obj`,
  ).text()
  // Use the viewer's OBJ parser and material-group identities; no generated box
  // stands in for the actual metal tabs or contacts.
  const model = new OBJLoader().parse(text.replace(/newmtl[\s\S]*?endmtl/g, ""))
  const shellPoints: Vector3[] = []
  const contacts: Vector3[] = []
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const geometry = object.geometry
    const vertices = geometry.getAttribute("position")
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material]
    for (const group of geometry.groups) {
      const material = materials[group.materialIndex ?? 0]?.name
      if (material !== "1" && material !== "4") continue
      for (let i = group.start; i < group.start + group.count; i += 3) {
        const triangle = [0, 1, 2].map((offset) =>
          new Vector3()
            .fromBufferAttribute(
              vertices,
              geometry.index ? geometry.index.getX(i + offset) : i + offset,
            )
            .applyEuler(rotation)
            .add(position),
        )
        if (material === "4") {
          contacts.push(...triangle)
          continue
        }
        shellPoints.push(
          ...triangle.filter((point) => point.z >= bottom && point.z <= top),
        )
        for (let edge = 0; edge < 3; edge++) {
          const line = new Line3(triangle[edge]!, triangle[(edge + 1) % 3]!)
          for (const plane of planes) {
            const crossing = plane.intersectLine(line, new Vector3())
            if (crossing) shellPoints.push(crossing)
          }
        }
      }
    }
  })
  expect(shellPoints.length).toBeGreaterThan(0)
  const holesUsed = new Set<string>()
  for (const point of shellPoints) {
    const distances = holes.map((hole) => holeClearance(point, hole))
    const nearest = Math.min(...distances)
    expect(nearest).toBeLessThanOrEqual(0.0001)
    holesUsed.add(holes[distances.indexOf(nearest)]!.pcb_plated_hole_id)
  }
  expect(holesUsed.size).toBe(4)
  expect(Math.min(...contacts.map((point) => point.z))).toBeCloseTo(top, 5)
  const padsUsed = new Set<string>()
  for (const point of contacts.filter(
    (point) => Math.abs(point.z - top) < 0.0001,
  )) {
    const pad = pads.find(
      (candidate) =>
        candidate.shape === "rect" &&
        Math.abs(point.x - candidate.x) <= candidate.width / 2 + 0.0001 &&
        Math.abs(point.y - candidate.y) <= candidate.height / 2 + 0.0001,
    )
    expect(pad).toBeDefined()
    if (pad) padsUsed.add(pad.pcb_smtpad_id)
  }
  expect(padsUsed.size).toBe(5)
})
