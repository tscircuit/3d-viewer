import { afterEach, expect, test } from "bun:test"
import { setDynamicImportResolver } from "@tscircuit/internal-dynamic-import"
import type { CadComponent } from "circuit-json"
import {
  createModelDownload,
  getModelDownloadAvailability,
  getStandaloneModel,
} from "../src/utils/model-download"

const cad = (fields: Partial<CadComponent> = {}): CadComponent => ({
  type: "cad_component",
  cad_component_id: "cad1",
  source_component_id: "source1",
  pcb_component_id: "pcb1",
  model_object_fit: "contain_within_bounds",
  anchor_alignment: "center",
  position: { x: 12, y: 8, z: 2 },
  rotation: { x: 0, y: 0, z: 90 },
  ...fields,
})
const originalFetch = globalThis.fetch
afterEach(() => {
  setDynamicImportResolver(undefined)
  globalThis.fetch = originalFetch
})

test("available formats follow the displayed source, including mesh-only and unknown models", () => {
  expect(
    getModelDownloadAvailability(cad({ footprinter_string: "soic8" })),
  ).toEqual({ GLB: true, STEP: true, x_t: true })
  expect(
    getModelDownloadAvailability(cad({ model_obj_url: "chip.obj" })),
  ).toEqual({ GLB: true, STEP: false, x_t: false })
  expect(
    getModelDownloadAvailability(
      cad({ model_glb_url: "chip.glb", footprinter_string: "soic8" }),
    ),
  ).toEqual({ GLB: true, STEP: false, x_t: false })
  expect(
    getModelDownloadAvailability(
      cad({ model_glb_url: "chip.glb", model_step_url: "chip.step" }),
    ),
  ).toEqual({ GLB: true, STEP: true, x_t: false })
  expect(
    getModelDownloadAvailability(cad({ model_wrl_url: "chip.wrl" })),
  ).toEqual({ GLB: false, STEP: false, x_t: false })
  expect(getModelDownloadAvailability(cad())).toEqual({
    GLB: false,
    STEP: false,
    x_t: false,
  })
})

test("unavailable exports never load a converter", async () => {
  setDynamicImportResolver(() => {
    throw new Error("must not import")
  })
  await expect(
    createModelDownload(cad({ model_obj_url: "chip.obj" }), "STEP"),
  ).rejects.toThrow("unavailable")
})

test("original STEP and GLB files use the static asset resolver without conversion", async () => {
  const urls: string[] = []
  globalThis.fetch = (async (url: string) => {
    urls.push(url)
    return new Response("original model")
  }) as typeof fetch
  setDynamicImportResolver(() => {
    throw new Error("must not import")
  })
  const model = cad({
    model_step_url: "./chip.step",
    model_glb_url: "./chip.glb",
  })
  for (const format of ["STEP", "GLB"] as const) {
    const blob = await createModelDownload(
      model,
      format,
      (url) => `https://assets.example/${url.slice(2)}`,
    )
    expect(await blob.text()).toBe("original model")
  }
  expect(urls).toEqual([
    "https://assets.example/chip.step",
    "https://assets.example/chip.glb",
  ])
})

test("failed asset downloads reject instead of saving error pages", async () => {
  globalThis.fetch = (async () =>
    new Response("missing", { status: 404 })) as typeof fetch
  await expect(
    createModelDownload(cad({ model_step_url: "chip.step" }), "STEP"),
  ).rejects.toThrow("404")
})

test("generated STEP and Parasolid lazily load only the selected exporter", async () => {
  const plan = {
    type: "primitive",
    shape: "cuboid",
    size: [2, 3, 4],
  } as unknown as NonNullable<CadComponent["model_jscad"]>
  const imports: string[] = []
  setDynamicImportResolver(async (specifier) => {
    imports.push(specifier)
    const convert = (input: unknown) => {
      expect(input).toBe(plan)
      return "converted solid"
    }
    return { jscadToStep: convert, jscadToParasolid: convert }
  })
  const model = cad({ model_jscad: plan })
  expect(await (await createModelDownload(model, "STEP")).text()).toBe(
    "converted solid",
  )
  expect(await (await createModelDownload(model, "x_t")).text()).toBe(
    "converted solid",
  )
  expect(imports).toEqual(["jscad-to-step", "jscad-to-parasolid"])
})

test("GLB conversion receives only the selected model with local placement and resolved assets", async () => {
  const model = cad({ model_obj_url: "./chip.obj" })
  const before = structuredClone(model)
  setDynamicImportResolver(async (specifier) => {
    expect(specifier).toBe("circuit-json-to-gltf")
    return {
      convertCircuitJsonTo3D: async (
        elements: CadComponent[],
        options: unknown,
      ) => {
        expect(elements).toHaveLength(1)
        expect(elements[0]!.position).toEqual({ x: 0, y: 0, z: 0 })
        expect(elements[0]!.pcb_component_id).toBeUndefined()
        expect(elements[0]!.model_obj_url).toBe(
          "https://assets.example/chip.obj",
        )
        expect(options).toEqual({
          drawFauxBoard: false,
          renderBoardTextures: false,
        })
        return { boxes: [{ mesh: { triangles: [{}] } }] }
      },
      convertSceneToGLTF: async (_scene: unknown, options: unknown) => {
        expect(options).toEqual({ binary: true })
        return new Uint8Array([0x67, 0x6c, 0x54, 0x46]).buffer
      },
    }
  })
  const blob = await createModelDownload(
    model,
    "GLB",
    () => "https://assets.example/chip.obj",
  )
  expect(blob.type).toBe("model/gltf-binary")
  expect(await blob.text()).toBe("glTF")
  expect(model).toEqual(before)
})

test("GLB placeholder boxes and converter failures reject", async () => {
  setDynamicImportResolver(async () => ({
    convertCircuitJsonTo3D: async () => ({ boxes: [{}] }),
  }))
  await expect(
    createModelDownload(cad({ model_gltf_url: "chip.gltf" }), "GLB"),
  ).rejects.toThrow("could not be converted")
  setDynamicImportResolver(async () => {
    throw new Error("CDN unavailable")
  })
  await expect(
    createModelDownload(cad({ model_obj_url: "chip.obj" }), "GLB"),
  ).rejects.toThrow("CDN unavailable")
})

test("standalone export uses viewer source priority rather than converter fallback priority", () => {
  const standalone = getStandaloneModel(
    cad({
      model_gltf_url: "chip.gltf",
      model_stl_url: "chip.stl",
      model_step_url: "chip.step",
      footprinter_string: "soic8",
    }),
  )
  expect(standalone.model_gltf_url).toBe("chip.gltf")
  expect(standalone.model_stl_url).toBeUndefined()
  expect(standalone.model_step_url).toBeUndefined()
  expect(standalone.footprinter_string).toBeUndefined()
})

test("footprint solid exports render geometry before invoking the lazy converter", async () => {
  setDynamicImportResolver(async (specifier) => {
    expect(specifier).toBe("jscad-to-step")
    return {
      jscadToStep: (model: {
        geometries: Array<{ geom: { polygons: unknown[] } }>
      }) => {
        expect(model.geometries.length).toBeGreaterThan(0)
        expect(
          model.geometries.every((entry) => entry.geom.polygons.length > 0),
        ).toBe(true)
        return "solid footprint"
      },
    }
  })
  expect(
    await (
      await createModelDownload(cad({ footprinter_string: "soic8" }), "STEP")
    ).text(),
  ).toBe("solid footprint")
})
