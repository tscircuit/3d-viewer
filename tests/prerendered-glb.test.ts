import { expect, spyOn, test } from "bun:test"
import * as THREE from "three"
import { disposeGlbScene, loadGlbScene } from "../src/utils/prerendered-glb"
import { pickCadComponent } from "../src/utils/pick-cad-component"
import { pickSchematicComponent } from "../src/utils/pick-schematic-component"

const fixture = () =>
  Bun.file(
    new URL("./assets/prerendered-components.glb", import.meta.url),
  ).arrayBuffer()

test("loads GLB bytes without model requests and retains names and per-instance picking", async () => {
  const fetchSpy = spyOn(globalThis, "fetch")
  const model = await loadGlbScene(
    await fixture(),
    new AbortController().signal,
  )
  expect(fetchSpy).not.toHaveBeenCalled()
  fetchSpy.mockRestore()
  const scene = {
    rootObject: model,
    camera: new THREE.PerspectiveCamera(45, 1, 0.1, 100),
    renderer: {
      domElement: {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 200,
          height: 200,
        }),
      },
    } as THREE.WebGLRenderer,
  }
  for (const [x, id] of [
    [5, "cad1"],
    [15, "cad2"],
  ] as const) {
    scene.camera.position.set(x, 7, 30)
    expect(pickCadComponent(scene, { x: 100, y: 100 }, [])).toEqual({
      cad_component_id: id,
      componentName: "U1",
    })
    expect(pickSchematicComponent(scene, { x: 100, y: 100 }, [])).toEqual({
      source_component_id: "source1",
      pcb_component_id: "pcb1",
      refdes: "U1",
    })
  }
  const cad1 = model.getObjectByProperty("name", "U1")!
  const bounds = new THREE.Box3().setFromObject(cad1)
  // Known circuit-space dimensions/center, not a restatement of the matrix.
  expect(bounds.min.x).toBeCloseTo(4)
  expect(bounds.min.y).toBeCloseTo(5)
  expect(bounds.min.z).toBeCloseTo(0)
  expect(bounds.max.x).toBeCloseTo(6)
  expect(bounds.max.y).toBeCloseTo(9)
  expect(bounds.max.z).toBeCloseTo(6)
  cad1.visible = false
  scene.camera.position.set(5, 7, 30)
  expect(pickCadComponent(scene, { x: 100, y: 100 }, [])).toBeUndefined()
  disposeGlbScene(model)
})

test("one GLB request suffices, and failed or cancelled loads reject", async () => {
  const bytes = await fixture()
  const paths: string[] = []
  const server = Bun.serve({
    port: 0,
    fetch(request) {
      const path = new URL(request.url).pathname
      paths.push(path)
      return path === "/board.glb"
        ? new Response(bytes)
        : new Response("missing", { status: 404 })
    },
  })
  try {
    const model = await loadGlbScene(
      new URL("/board.glb", server.url).href,
      new AbortController().signal,
    )
    expect(paths).toEqual(["/board.glb"])
    disposeGlbScene(model)
    await expect(
      loadGlbScene(
        new URL("/missing.glb", server.url).href,
        new AbortController().signal,
      ),
    ).rejects.toThrow("404")
    const controller = new AbortController()
    controller.abort()
    await expect(loadGlbScene(bytes, controller.signal)).rejects.toThrow()
    await expect(
      loadGlbScene(new ArrayBuffer(10), new AbortController().signal),
    ).rejects.toThrow()
  } finally {
    server.stop(true)
  }
})

test("shared geometry, materials and textures are disposed exactly once", () => {
  const root = new THREE.Group()
  const geometry = new THREE.BoxGeometry()
  const texture = new THREE.Texture()
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    normalMap: texture,
  })
  root.add(
    new THREE.Mesh(geometry, material),
    new THREE.Mesh(geometry, material),
  )
  const geometryDispose = spyOn(geometry, "dispose")
  const textureDispose = spyOn(texture, "dispose")
  const materialDispose = spyOn(material, "dispose")
  disposeGlbScene(root)
  expect(geometryDispose).toHaveBeenCalledTimes(1)
  expect(textureDispose).toHaveBeenCalledTimes(1)
  expect(materialDispose).toHaveBeenCalledTimes(1)
})
