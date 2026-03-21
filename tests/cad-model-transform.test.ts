import { expect, test } from "bun:test"
import type { CadComponent } from "circuit-json"
import { getCadModelTransform } from "../src/utils/cad-model-transform"
import {
  getCadModelType,
  getRenderedCadModelType,
} from "../src/utils/get-cad-model-type"

function createCadComponent(
  overrides: Partial<CadComponent> = {},
): CadComponent {
  return {
    type: "cad_component",
    cad_component_id: "cad_component_0",
    pcb_component_id: "pcb_component_0",
    source_component_id: "source_component_0",
    anchor_alignment: "center",
    position: { x: 0, y: 0, z: 0.7 },
    rotation: { x: 0, y: 0, z: 0 },
    model_object_fit: "contain_within_bounds",
    ...overrides,
  }
}

test("uses model_origin_position like circuit-json-to-gltf for top-layer CAD placement", () => {
  const cadComponent = createCadComponent({
    position: {
      x: 0,
      y: 1.0658141036401503e-14,
      z: 0.7,
    },
    rotation: {
      x: 0,
      y: 0,
      z: 270,
    },
    model_obj_url:
      "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=4e90b6d8552a4e058d9ebe9d82e11f3a&pn=C9900017879&cachebust_origin=",
    model_origin_alignment: "center_of_component_on_board_surface",
    anchor_alignment: "center_of_component_on_board_surface",
    model_origin_position: {
      x: 0,
      y: 0,
      z: -2.5,
    },
  })

  const transform = getCadModelTransform(cadComponent, {
    layer: "top",
    pcbThickness: 1.4,
    modelType: "obj",
  })

  expect(transform.position).toEqual([0, 1.0658141036401503e-14, 0.7])
  expect(transform.rotation).toEqual([0, 0, (270 * Math.PI) / 180])
  expect(transform.modelRotation).toEqual([0, 0, 0])
  expect(transform.modelPosition[0]).toBeCloseTo(0)
  expect(transform.modelPosition[1]).toBeCloseTo(0)
  expect(transform.modelPosition[2]).toBeCloseTo(2.5)
})

test("rotates model origin with viewer z+ as the board-up baseline", () => {
  const cadComponent = createCadComponent({
    cad_component_id: "cad_component_1",
    pcb_component_id: "pcb_component_1",
    source_component_id: "source_component_1",
    position: { x: 1, y: 2, z: 3 },
    model_board_normal_direction: "y+",
    model_origin_position: { x: 0, y: 1, z: 0 },
  })

  const transform = getCadModelTransform(cadComponent, {
    layer: "top",
    pcbThickness: 1.4,
    modelType: "gltf",
  })

  expect(transform.modelRotation).toEqual([Math.PI / 2, 0, 0])
  expect(transform.modelPosition[0]).toBeCloseTo(0)
  expect(transform.modelPosition[1]).toBeCloseTo(0)
  expect(transform.modelPosition[2]).toBeCloseTo(-1)
})

test("does not shift model origin when model_origin_position is missing", () => {
  const cadComponent = createCadComponent({
    cad_component_id: "cad_component_2",
    pcb_component_id: "pcb_component_2",
    source_component_id: "source_component_2",
    position: { x: 0, y: 0, z: 0.7 },
    rotation: { x: 0, y: 0, z: 90 },
    model_board_normal_direction: "y+",
  })

  const transform = getCadModelTransform(cadComponent, {
    layer: "top",
    pcbThickness: 1.4,
    modelType: "obj",
  })

  expect(transform.modelRotation).toEqual([Math.PI / 2, 0, 0])
  expect(transform.modelPosition[0]).toBeCloseTo(0)
  expect(transform.modelPosition[1]).toBeCloseTo(0)
  expect(transform.modelPosition[2]).toBeCloseTo(0)
})

test("transforms model origin in loader space before board-normal rotation", () => {
  const cadComponent = createCadComponent({
    model_obj_url: "https://example.com/model.obj",
    model_board_normal_direction: "y+",
    model_origin_position: { x: 1, y: 2, z: 3 },
  })

  const transform = getCadModelTransform(cadComponent, {
    layer: "top",
    pcbThickness: 1.4,
    modelType: "obj",
  })

  expect(transform.modelPosition[0]).toBeCloseTo(-1)
  expect(transform.modelPosition[1]).toBeCloseTo(3)
  expect(transform.modelPosition[2]).toBeCloseTo(-2)
})

test("preserves bottom-layer placement emitted by circuit-json", () => {
  const cadComponent = createCadComponent({
    position: { x: 1, y: 2, z: -0.7 },
    rotation: { x: 0, y: 180, z: 180 },
  })

  const transform = getCadModelTransform(cadComponent, {
    layer: "bottom",
    pcbThickness: 1.4,
    modelType: "glb",
  })

  expect(transform.position?.[0]).toBeCloseTo(1)
  expect(transform.position?.[1]).toBeCloseTo(2)
  expect(transform.position?.[2]).toBeCloseTo(-0.7)
  expect(transform.rotation[0]).toBeCloseTo(0)
  expect(transform.rotation[1]).toBeCloseTo(Math.PI)
  expect(transform.rotation[2]).toBeCloseTo(Math.PI)
})

test("synthesizes a bottom-layer fallback when the input is not bottom-adjusted", () => {
  const cadComponent = createCadComponent({
    position: { x: 1, y: 2, z: 0.7 },
    rotation: undefined,
  })

  const transform = getCadModelTransform(cadComponent, {
    layer: "bottom",
    pcbThickness: 1.4,
    modelType: "glb",
  })

  expect(transform.position?.[0]).toBeCloseTo(1)
  expect(transform.position?.[1]).toBeCloseTo(2)
  expect(transform.position?.[2]).toBeCloseTo(-2.1)
  expect(transform.rotation[0]).toBeCloseTo(Math.PI)
  expect(transform.rotation[1]).toBeCloseTo(0)
  expect(transform.rotation[2]).toBeCloseTo(0)
})

test("keeps origin handling consistent between obj and gltf after loader conversion", () => {
  const objCadComponent = createCadComponent({
    model_obj_url: "https://example.com/model.obj",
    model_origin_position: { x: 1, y: 2, z: 3 },
  })
  const gltfCadComponent = createCadComponent({
    model_glb_url: "https://example.com/model.glb",
    model_origin_position: { x: 1, y: 2, z: 3 },
  })

  const objTransform = getCadModelTransform(objCadComponent, {
    layer: "top",
    pcbThickness: 1.4,
    modelType: "obj",
  })
  const gltfTransform = getCadModelTransform(gltfCadComponent, {
    layer: "top",
    pcbThickness: 1.4,
    modelType: "glb",
  })

  expect(objTransform.modelPosition).toEqual([-1, -2, -3])
  expect(gltfTransform.modelPosition).toEqual([-1, -2, -3])
})

test("uses rendered glb conventions for step placement", () => {
  const cadComponent = createCadComponent({
    model_step_url: "https://example.com/model.step",
    model_origin_position: { x: 1, y: 2, z: 3 },
  })

  const sourceType = getCadModelType(cadComponent)
  const renderedType = getRenderedCadModelType(sourceType)
  const transform = getCadModelTransform(cadComponent, {
    layer: "top",
    pcbThickness: 1.4,
    modelType: renderedType,
  })

  expect(sourceType).toBe("step")
  expect(renderedType).toBe("glb")
  expect(transform.modelPosition).toEqual([-1, -2, -3])
})

test("prefers gltf over step and obj when multiple model urls are present", () => {
  const cadComponent = createCadComponent({
    model_glb_url: "https://example.com/model.glb",
    model_step_url: "https://example.com/model.step",
    model_obj_url: "https://example.com/model.obj",
  })

  expect(getCadModelType(cadComponent)).toBe("glb")
})
