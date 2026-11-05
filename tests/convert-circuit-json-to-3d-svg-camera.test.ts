import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { JSDOM } from "jsdom"
import * as THREE from "three"
import {
  convertCircuitJsonTo3dSvg,
  createCamera,
} from "../src/convert-circuit-json-to-3d-svg"
import { applyJsdomShim } from "../src/utils/jsdom-shim"

const sampleCircuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "cad_component",
    cad_component_id: "cad_component_0",
    pcb_component_id: "pcb_component_0",
    source_component_id: "source_component_0",
    anchor_alignment: "center",
    model_object_fit: "contain_within_bounds",
    position: { x: 0, y: 0, z: 1.1 },
    rotation: { x: 0, y: 0, z: 0 },
    size: { x: 2, y: 1, z: 0.6 },
  },
]

test("createCamera defaults to PerspectiveCamera with angled position and Z-up axis", () => {
  const camera = createCamera({
    screenSize: { width: 800, height: 600 },
  })

  expect(camera).toBeInstanceOf(THREE.PerspectiveCamera)
  expect(camera.position.x).toBe(10)
  expect(camera.position.y).toBe(10)
  expect(camera.position.z).toBe(10)
  expect(camera.up.x).toBe(0)
  expect(camera.up.y).toBe(0)
  expect(camera.up.z).toBe(1)
})

test("createCamera supports perspective views (top, front, side, angled)", () => {
  const topCam = createCamera({
    perspective: "top",
    screenSize: { width: 800, height: 600 },
  })
  expect(topCam).toBeInstanceOf(THREE.PerspectiveCamera)
  expect(topCam.position.toArray()).toEqual([0, 0, 100])
  expect(topCam.up.toArray()).toEqual([0, 0, 1])

  const frontCam = createCamera({
    perspective: "front",
    screenSize: { width: 800, height: 600 },
  })
  expect(frontCam).toBeInstanceOf(THREE.PerspectiveCamera)
  expect(frontCam.position.toArray()).toEqual([0, -10, 0])
  expect(frontCam.up.toArray()).toEqual([0, 0, 1])

  const sideCam = createCamera({
    perspective: "side",
    screenSize: { width: 800, height: 600 },
  })
  expect(sideCam).toBeInstanceOf(THREE.PerspectiveCamera)
  expect(sideCam.position.toArray()).toEqual([10, 0, 0])
  expect(sideCam.up.toArray()).toEqual([0, 0, 1])
})

test("createCamera supports isometric orthographic views and zoom scaling", () => {
  const isoCam = createCamera({
    perspective: "isometric-angled",
    screenSize: { width: 800, height: 400 },
    zoom: 2,
  })

  expect(isoCam).toBeInstanceOf(THREE.OrthographicCamera)
  const ortho = isoCam as THREE.OrthographicCamera
  expect(ortho.top).toBe(25)
  expect(ortho.bottom).toBe(-25)
  expect(ortho.right).toBe(50)
  expect(ortho.left).toBe(-50)
  expect(ortho.position.toArray()).toEqual([10, 10, 10])
  expect(ortho.up.toArray()).toEqual([0, 0, 1])
})

test("convertCircuitJsonTo3dSvg renders default angled perspective and isometric views", async () => {
  const dom = new JSDOM()
  applyJsdomShim(dom)

  const defaultSvg = await convertCircuitJsonTo3dSvg(sampleCircuitJson)
  const isometricSvg = await convertCircuitJsonTo3dSvg(sampleCircuitJson, {
    perspective: "isometric-angled",
  })

  expect(defaultSvg).toContain("<svg")
  expect(defaultSvg).toContain("<path")
  expect(isometricSvg).toContain("<svg")
  expect(isometricSvg).toContain("<path")
  expect(defaultSvg).not.toBe(isometricSvg)
})
