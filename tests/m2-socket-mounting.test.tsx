import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { fileURLToPath, pathToFileURL } from "node:url"
import { prepareM2SocketModel } from "../scripts/prepare-m2-daughtercard"
import type { CadComponent } from "circuit-json"
import { convertCircuitJsonTo3D } from "circuit-json-to-gltf"
import { Box2, Group, Ray, Vector2, Vector3 } from "three"
import { Circuit } from "tscircuit"
import { getCadModelTransform } from "../src/utils/cad-model-transform"
import {
  getCadModelType,
  getRenderedCadModelType,
} from "../src/utils/get-cad-model-type"
import Carrier from "./fixtures/renderer-parity/circuits/m2-carrier.circuit"
import Daughtercard from "./fixtures/renderer-parity/circuits/m2-daughtercard.circuit"
import { m2SocketSha256 } from "./fixtures/renderer-parity/m2"

test("the actual M-key STEP slot, key, feet and pegs fit the authored card and carrier", async () => {
  const step = pathToFileURL(
    await prepareM2SocketModel(fileURLToPath(new URL("..", import.meta.url))),
  )
  expect(
    createHash("sha256")
      .update(await Bun.file(fileURLToPath(step)).bytes())
      .digest("hex"),
  ).toBe(m2SocketSha256)
  // Load the vendor model alone, without normalization, for independent
  // measured landmarks. This is not the Circuit JSON fed to either renderer.
  const native = await convertCircuitJsonTo3D(
    [
      {
        type: "cad_component",
        cad_component_id: "measurement",
        pcb_component_id: "measurement",
        source_component_id: "measurement",
        anchor_alignment: "center_of_component_on_board_surface",
        model_object_fit: "contain_within_bounds",
        model_step_url: step.href,
        model_board_normal_direction: "z+",
        model_origin_position: { x: 0, y: 0, z: 0 },
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      },
    ],
    { coordinateTransform: {} },
  )
  const mesh = native.boxes[0]?.mesh
  if (!mesh) throw new Error("Detailed STEP mesh is missing")
  expect(mesh.triangles.length).toBeGreaterThan(10000)
  const vertices = mesh.triangles.flatMap((triangle) => triangle.vertices)
  const hasVertex = (x: number, y: number, z: number) =>
    vertices.some((v) => Math.hypot(v.x - x, v.y - y, v.z - z) < 1e-5)
  expect(hasVertex(-5.575, 2.839, 0.46)).toBe(true)
  expect(hasVertex(-6.675, 2.839, -0.46)).toBe(true)
  expect(hasVertex(10.075, 2.839, 0.46)).toBe(true)
  expect(hasVertex(-10.075, 2.839, -0.46)).toBe(true)

  const circuit = new Circuit()
  circuit.add(<Carrier />)
  await circuit.renderUntilSettled()
  const elements = circuit.getCircuitJson()
  const board = elements.find((e) => e.type === "pcb_board")
  const socket = elements.find(
    (e) => e.type === "cad_component" && e.model_step_url,
  )
  const card = elements.find(
    (e) => e.type === "cad_component" && e.model_glb_url,
  )
  if (
    !board ||
    !socket ||
    socket.type !== "cad_component" ||
    !card ||
    card.type !== "cad_component"
  ) {
    throw new Error("Missing authored assembly")
  }
  expect(elements.filter((e) => e.type === "pcb_cutout")).toHaveLength(0)

  const toWorld = (cad: CadComponent) => {
    const transform = getCadModelTransform(cad, {
      layer: "top",
      pcbThickness: board.thickness,
      modelType: getRenderedCadModelType(getCadModelType(cad)),
    })
    if (!transform.position) throw new Error("Missing CAD position")
    const outer = new Group()
    outer.position.fromArray(transform.position)
    outer.rotation.fromArray(transform.rotation)
    const inner = new Group()
    inner.position.fromArray(transform.modelPosition)
    inner.rotation.fromArray(transform.modelRotation)
    outer.add(inner)
    outer.updateMatrixWorld(true)
    return (x: number, y: number, z: number) =>
      inner.localToWorld(new Vector3(x, y, z))
  }
  const socketPoint = toWorld(socket)
  const cardPoint = toWorld(card)
  const sourcePoint = (x: number, y: number, z: number) => cardPoint(-x, z, y)
  // First downward intersection inside the open slot is the physical stop.
  // Moving the coupon deeper to conceal copper would penetrate this surface.
  for (const x of [-9, -3, 0, 3, 9]) {
    const ray = new Ray(new Vector3(x, 6, 0), new Vector3(0, -1, 0))
    const hits: Vector3[] = []
    for (const triangle of mesh.triangles) {
      const [a, b, c] = triangle.vertices.map((v) => new Vector3(v.x, v.y, v.z))
      const hit = ray.intersectTriangle(a!, b!, c!, false, new Vector3())
      if (hit) hits.push(hit)
    }
    hits.sort((a, b) => ray.origin.distanceTo(a) - ray.origin.distanceTo(b))
    const first = hits[0]
    if (!first) throw new Error(`No socket floor at native X=${x}`)
    expect(first.y).toBeCloseTo(2.839, 5)
    expect(
      sourcePoint(-12, -x, 0).distanceTo(
        socketPoint(first.x, first.y, first.z),
      ),
    ).toBeLessThan(1e-5)
  }
  const floor = socketPoint(0, 2.839, 0)
  expect(sourcePoint(-12, 0, 0).distanceTo(floor)).toBeLessThan(1e-5)
  expect(floor.z).toBeCloseTo(board.thickness / 2 + 2.839, 5)
  const rise = sourcePoint(12, 0, 0).sub(floor)
  expect(rise.z).toBeCloseTo(24, 5)
  expect(Math.hypot(rise.x, rise.y)).toBeLessThan(1e-5)
  const key = socketPoint(-6.125, 2.839, 0)
  expect(sourcePoint(-12, 6.125, 0).distanceTo(key)).toBeLessThan(1e-5)

  const daughter = new Circuit()
  daughter.add(<Daughtercard />)
  await daughter.renderUntilSettled()
  const daughterElements = daughter.getCircuitJson()
  const daughterBoard = daughterElements.find((e) => e.type === "pcb_board")
  const notch = daughterElements.find((e) => e.type === "pcb_cutout")
  if (!daughterBoard?.outline || !notch || notch.shape !== "polygon") {
    throw new Error("Missing mating card outline or notch")
  }
  const notchBounds = new Box2().setFromPoints(
    notch.points.map(({ x, y }) => new Vector2(x, y)),
  )
  const notchSideA = sourcePoint(-12, notchBounds.min.y, 0)
  const notchSideB = sourcePoint(-12, notchBounds.max.y, 0)
  expect(notchSideA.distanceTo(socketPoint(-5.575, 2.839, 0))).toBeCloseTo(
    0.05,
    5,
  )
  expect(notchSideB.distanceTo(socketPoint(-6.675, 2.839, 0))).toBeCloseTo(
    0.05,
    5,
  )
  expect(
    sourcePoint(notchBounds.max.x, notchBounds.getCenter(new Vector2()).y, 0).z,
  ).toBeGreaterThan(socketPoint(-6.125, 5.5, 0).z)
  expect(
    sourcePoint(-12, 0, daughterBoard.thickness / 2).distanceTo(
      socketPoint(0, 2.839, 0.46),
    ),
  ).toBeCloseTo(0.06, 5)
  expect(
    sourcePoint(-12, 0, -daughterBoard.thickness / 2).distanceTo(
      socketPoint(0, 2.839, -0.46),
    ),
  ).toBeCloseTo(0.06, 5)
  const tongue = daughterBoard.outline.filter((p) => p.x === -12)
  expect(tongue).toHaveLength(2)
  expect(
    sourcePoint(tongue[0]!.x, tongue[0]!.y, 0).distanceTo(
      socketPoint(10.075, 2.839, 0),
    ),
  ).toBeCloseTo(0.15, 5)
  expect(
    sourcePoint(tongue[1]!.x, tongue[1]!.y, 0).distanceTo(
      socketPoint(-10.075, 2.839, 0),
    ),
  ).toBeCloseTo(0.15, 5)
  const contacts = daughterElements
    .filter((e) => e.type === "pcb_smtpad")
    .filter((e) => e.shape === "rect")
    .filter((e) => e.x < -8.5)
  expect(contacts).toHaveLength(67)
  const hostPads = elements
    .filter((e) => e.type === "pcb_smtpad")
    .filter((e) => e.pcb_component_id === socket.pcb_component_id)
  expect(hostPads).toHaveLength(69)
  for (const pad of hostPads) {
    if (pad.shape !== "rect") throw new Error("Expected rectangular host land")
    expect(pad.layer).toBe("top")
    const feet = vertices.filter(
      (v) =>
        Math.abs(v.y) < 1e-5 &&
        Math.abs(v.x - pad.y) < pad.height / 2 &&
        Math.abs(v.z - pad.x) < pad.width / 2,
    )
    // Board locks have a modeled 0.04 mm stand-off; signal tails are Y=0.
    if (
      pad.port_hints?.includes("mount1") ||
      pad.port_hints?.includes("mount2")
    ) {
      expect(
        vertices.some(
          (v) =>
            Math.abs(v.y - 0.04) < 1e-5 &&
            Math.abs(v.x - pad.y) < pad.height / 2 &&
            Math.abs(v.z - pad.x) < pad.width / 2,
        ),
      ).toBe(true)
      continue
    }
    expect(feet.length).toBeGreaterThan(0)
    for (const foot of feet) {
      expect(socketPoint(foot.x, foot.y, foot.z).z).toBeCloseTo(
        board.thickness / 2,
        5,
      )
    }
    const contact = contacts.find(
      (p) => p.port_hints?.[0] === pad.port_hints?.[0],
    )
    if (!contact) throw new Error(`Missing card contact ${pad.port_hints}`)
    if (contact.layer !== "top" && contact.layer !== "bottom") {
      throw new Error("Expected a two-sided card contact")
    }
    const face = { top: 0.4, bottom: -0.4 }[contact.layer]
    expect(sourcePoint(contact.x, contact.y, face).y).toBeCloseTo(pad.y, 5)
    expect(Math.sign(sourcePoint(contact.x, contact.y, face).x)).toBe(
      Math.sign(pad.x),
    )
    const copperStart = sourcePoint(
      contact.x - contact.width / 2,
      contact.y,
      face,
    )
    const copperEnd = sourcePoint(
      contact.x + contact.width / 2,
      contact.y,
      face,
    )
    expect(copperEnd.z).toBeLessThan(socketPoint(0, 5.5, 0).z)
    // Only the corresponding spring on this face, not housing or other bank.
    // The vendor springs are undeflected; their intrusion into the nominal
    // card thickness identifies the mating band, not a clearance failure.
    const engagement = vertices.filter(
      (v) =>
        Math.abs(v.x + contact.y) < contact.height / 2 &&
        v.y > 2.839 &&
        Math.abs(v.z) < Math.abs(face) &&
        Math.sign(v.z) === Math.sign(face),
    )
    expect(engagement.length).toBeGreaterThan(0)
    for (const point of engagement) {
      const spring = socketPoint(point.x, point.y, point.z)
      expect(spring.z).toBeGreaterThan(copperStart.z)
      expect(spring.z).toBeLessThan(copperEnd.z)
      expect(Math.abs(spring.y - copperStart.y)).toBeLessThan(
        contact.height / 2,
      )
    }
  }
  const holes = elements.filter((e) => e.type === "pcb_hole")
  expect(holes).toHaveLength(2)
  for (const hole of holes) {
    if (hole.hole_shape !== "circle")
      throw new Error("Expected round locating hole")
    const peg = socketPoint(hole.y, -0.6, 0)
    expect(peg.x).toBeCloseTo(hole.x, 5)
    expect(peg.y).toBeCloseTo(hole.y, 5)
    expect(peg.z).toBeCloseTo(board.thickness / 2 - 0.6, 5)
    const pegVertices = vertices.filter(
      (v) => v.y < -0.1 && Math.abs(v.x - hole.y) < 0.8,
    )
    expect(pegVertices.length).toBeGreaterThan(0)
    for (const v of pegVertices) {
      expect(Math.hypot(v.x - hole.y, v.z)).toBeLessThan(hole.hole_diameter / 2)
    }
  }
}, 60_000)
