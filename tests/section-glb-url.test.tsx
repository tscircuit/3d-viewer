import { expect, spyOn, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { GlbScene } from "../src/CadViewerGlb"
import { CameraControllerProvider } from "../src/contexts/CameraControllerContext"
import { useGlbModel } from "../src/hooks/useGlbModel"
import { HoverContext } from "../src/react-three/HoverContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import {
  SectionProvider,
  useSection,
  type SectionState,
} from "../src/sections/SectionContext"
import { SectionScene } from "../src/sections/SectionScene"
import { createSectionExport } from "../src/sections/section-export"
import { sectionPlane } from "../src/sections/section-geometry"
import { pickCadComponent } from "../src/utils/pick-cad-component"

// Uses the actual URL loader and GLB scene attachment, with only WebGL replaced.
test("URL-loaded GLBs support transformed section caps, export, hiding, and source replacement", async () => {
  const dom = new JSDOM('<div id="root"></div><canvas></canvas>', {
    url: "http://localhost",
  })
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    IS_REACT_ACT_ENVIRONMENT: (globalThis as any).IS_REACT_ACT_ENVIRONMENT,
  }
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  const bytes = await Bun.file(
    new URL("./assets/prerendered-components.glb", import.meta.url),
  ).arrayBuffer()
  const requests: string[] = []
  let complete: (() => void) | undefined
  const fetchTarget: Pick<Window, "fetch"> = globalThis
  const fetchSpy = spyOn(fetchTarget, "fetch").mockImplementation(
    async (url) => {
      requests.push(String(url))
      if (String(url).includes("second"))
        await new Promise<void>((resolve) => {
          complete = resolve
        })
      return new Response(bytes)
    },
  )
  const canvas = document.querySelector("canvas")!
  canvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 200,
    height: 200,
    right: 200,
    bottom: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  const rootObject = new THREE.Group(),
    scene = new THREE.Scene()
  scene.add(rootObject)
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
  camera.up.set(0, 0, 1)
  camera.position.set(5, 7, 30)
  const listeners = new Set<() => void>()
  const context: ThreeContextState = {
    scene,
    rootObject,
    camera,
    renderer: {
      domElement: canvas,
      localClippingEnabled: false,
    } as unknown as THREE.WebGLRenderer,
    addFrameListener: (fn) => {
      listeners.add(fn as () => void)
    },
    removeFrameListener: (fn) => {
      listeners.delete(fn as () => void)
    },
  }
  let state: SectionState | null = null
  let loaded: THREE.Group | undefined
  const hover = { addHoverable: () => {}, removeHoverable: () => {} }
  function Model({
    source,
    hidden,
  }: {
    source: string
    hidden?: ReadonlySet<string>
  }) {
    const result = useGlbModel(source)
    loaded = result?.model
    return result?.model ? (
      <GlbScene model={result.model} hiddenCadComponentIds={hidden} />
    ) : null
  }
  function Probe() {
    state = useSection()
    return null
  }
  const reactRoot = createRoot(document.getElementById("root")!)
  const render = async (source: string, hidden?: ReadonlySet<string>) => {
    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <SectionProvider>
            <ThreeContext.Provider value={context}>
              <HoverContext.Provider value={hover}>
                <Model source={source} hidden={hidden} />
                <Probe />
                <SectionScene />
              </HoverContext.Provider>
            </ThreeContext.Provider>
          </SectionProvider>
        </CameraControllerProvider>,
      )
    })
  }
  const step = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 90))
      for (const frame of listeners) frame()
    })
    scene.updateMatrixWorld(true)
  }
  const caps = () => scene.getObjectByName("Section caps")!
  try {
    await render("https://example.test/first.glb")
    await step()
    expect(requests).toEqual(["https://example.test/first.glb"])
    expect(state!.bounds!.min.x).toBeCloseTo(4)
    expect(state!.bounds!.max.z).toBeCloseTo(6)
    const first = loaded!
    const firstMesh = first.getObjectByProperty("type", "Mesh") as THREE.Mesh
    const originalMaterial = firstMesh.material
    const geometryDisposed = spyOn(firstMesh.geometry, "dispose")
    const materialDisposed = spyOn(
      originalMaterial as THREE.Material,
      "dispose",
    )
    const spec = { axis: "x" as const, offset: 5, flipped: false }
    await act(async () => {
      state!.setSpec(spec)
      state!.setEditing(true)
    })
    for (let i = 0; i < 10 && !caps().children.length; i++) await step()
    expect(caps().children).toHaveLength(1)
    const cap = caps().children[0] as THREE.Mesh<
      THREE.BufferGeometry,
      THREE.MeshBasicMaterial
    >
    const p = cap.geometry.getAttribute("position")
    let area = 0
    for (let i = 0; i < p.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(p, i)
      const b = new THREE.Vector3().fromBufferAttribute(p, i + 1)
      const c = new THREE.Vector3().fromBufferAttribute(p, i + 2)
      expect(a.x).toBeCloseTo(5)
      area += b.sub(a).cross(c.sub(a)).length() / 2
    }
    expect(area).toBeCloseTo(24) // circuit-space box section: 4 mm × 6 mm
    expect(cap.material.map).toBeInstanceOf(THREE.DataTexture)
    expect(firstMesh.material).not.toBe(originalMaterial)
    const exported = createSectionExport(rootObject, spec)
    exported.root.updateWorldMatrix(true, true)
    let exportedCaps = 0
    exported.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      const positions = object.geometry.getAttribute("position")
      for (let i = 0; i < positions.count; i++) {
        const point = new THREE.Vector3()
          .fromBufferAttribute(positions, i)
          .applyMatrix4(object.matrixWorld)
        expect(
          sectionPlane(spec).distanceToPoint(point),
        ).toBeGreaterThanOrEqual(-1e-5)
      }
      if (object.material.map?.isDataTexture) exportedCaps++
    })
    expect(exportedCaps).toBeGreaterThan(0)
    exported.dispose()
    // The retained half still supports GLB metadata picking.
    camera.position.set(15, 7, 30)
    camera.lookAt(15, 7, 0)
    camera.updateMatrixWorld()
    expect(
      pickCadComponent(context, { x: 100, y: 100 }, [])?.cad_component_id,
    ).toBe("cad2")
    await render("https://example.test/first.glb", new Set(["cad1"]))
    await step()
    await step()
    expect(caps().children).toHaveLength(0)
    await render("https://example.test/first.glb")
    await step()
    await step()
    expect(caps().children).toHaveLength(1)
    expect(firstMesh.material).not.toBe(originalMaterial)
    await render("https://example.test/second.glb")
    await step()
    expect(rootObject.children).toHaveLength(0)
    expect(caps().children).toHaveLength(0)
    expect(geometryDisposed).toHaveBeenCalledTimes(1)
    // Restoring section overrides must not leave owned GLB materials undisposed.
    expect(materialDisposed).toHaveBeenCalledTimes(1)
    await act(async () => {
      complete!()
    })
    for (let i = 0; i < 10 && !caps().children.length; i++) await step()
    expect(requests).toHaveLength(2)
    expect(loaded).not.toBe(first)
    expect(caps().children).toHaveLength(1)
    await act(async () => {
      state!.setSpec(null)
      state!.setEditing(false)
    })
    await step()
    const replacement = loaded!.getObjectByProperty(
      "type",
      "Mesh",
    ) as THREE.Mesh<THREE.BufferGeometry, THREE.Material>
    expect(replacement.material.clippingPlanes).toBeNull()
    expect(caps().children).toHaveLength(0)
  } finally {
    await act(async () => reactRoot.unmount())
    expect(scene.getObjectByName("Section caps")).toBeUndefined()
    fetchSpy.mockRestore()
    Object.assign(globalThis, previous)
    dom.window.close()
  }
})
