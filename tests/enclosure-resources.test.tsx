import { expect, spyOn, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { cad_component, pcb_component } from "circuit-json"
import { JSDOM } from "jsdom"
import { act, type ComponentProps, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { AnyCadComponent } from "../src/AnyCadComponent"
import {
  LayerVisibilityProvider,
  useLayerVisibility,
} from "../src/contexts/LayerVisibilityContext"
import { useManifoldBoardBuilder } from "../src/hooks/useManifoldBoardBuilder"
import { HoverContext } from "../src/react-three/HoverContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"
import { JscadBoardTextures } from "../src/three-components/JscadBoardTextures"
import { JscadModel } from "../src/three-components/JscadModel"
import * as textureModule from "../src/textures/create-combined-board-textures"

async function withScene(
  run: (scene: {
    root: ReturnType<typeof createRoot>
    rootObject: THREE.Object3D
    context: ThreeContextState
  }) => Promise<void>,
) {
  const dom = new JSDOM('<div id="root"></div>')
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  const createElement = dom.window.document.createElement.bind(
    dom.window.document,
  )
  dom.window.document.createElement = ((tag: string, options: any) =>
    tag === "canvas" ? createCanvas(1, 1) : createElement(tag, options)) as any
  const root = createRoot(document.getElementById("root")!)
  const rootObject = new THREE.Object3D()
  const context: ThreeContextState = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: {} as THREE.WebGLRenderer,
    rootObject,
    addFrameListener: () => {},
    removeFrameListener: () => {},
  }
  try {
    await run({ root, rootObject, context })
  } finally {
    await act(async () => root.unmount())
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
}

const plan = {
  type: "cuboid" as const,
  size: [10, 8, 4] as [number, number, number],
}
const hover = { addHoverable: () => {}, removeHoverable: () => {} }
const noop = () => {}

const standaloneCad = cad_component.parse({
  type: "cad_component",
  cad_component_id: "mechanical",
  source_component_id: "motor",
  position: { x: 0, y: 0, z: 0 },
  model_jscad: plan,
})
const mountedCad = cad_component.parse({
  ...standaloneCad,
  cad_component_id: "mounted",
  pcb_component_id: "pcb_component",
})
const assemblyCircuit = [
  standaloneCad,
  mountedCad,
  pcb_component.parse({
    type: "pcb_component",
    pcb_component_id: "pcb_component",
    source_component_id: "motor",
    center: { x: 0, y: 0 },
    width: 10,
    height: 8,
    layer: "top",
    rotation: 0,
  }),
]

function AssemblyModels({
  onControls,
}: {
  onControls: (controls: ReturnType<typeof useLayerVisibility>) => void
}) {
  onControls(useLayerVisibility())
  return (
    <>
      <AnyCadComponent
        cad_component={standaloneCad}
        circuitJson={assemblyCircuit}
      />
      <AnyCadComponent
        cad_component={mountedCad}
        circuitJson={assemblyCircuit}
      />
    </>
  )
}

async function renderAssemblyModels({
  root,
  context,
}: {
  root: ReturnType<typeof createRoot>
  context: ThreeContextState
}) {
  let controls: ReturnType<typeof useLayerVisibility> | undefined
  await act(async () =>
    root.render(
      <ThreeContext.Provider value={context}>
        <HoverContext.Provider value={hover}>
          <LayerVisibilityProvider>
            <AssemblyModels
              onControls={(current) => {
                controls = current
              }}
            />
          </LayerVisibilityProvider>
        </HoverContext.Provider>
      </ThreeContext.Provider>,
    ),
  )
  if (!controls) throw new Error("Missing assembly visibility controls")
  return controls
}

test("assembly CAD is visible by default", async () => {
  await withScene(async ({ root, rootObject, context }) => {
    await renderAssemblyModels({ root, context })
    expect(rootObject.children).toHaveLength(2)
  })
})

test("hiding assembly keeps PCB-mounted CAD visible", async () => {
  await withScene(async ({ root, rootObject, context }) => {
    const controls = await renderAssemblyModels({ root, context })
    await act(async () => controls.setLayerVisibility("assembly", false))
    expect(
      rootObject.children.map((child) => child.userData.cad_component_id),
    ).toEqual(["mounted"])
  })
})

test("resetting layer visibility restores assembly CAD", async () => {
  await withScene(async ({ root, rootObject, context }) => {
    const controls = await renderAssemblyModels({ root, context })
    await act(async () => controls.setLayerVisibility("assembly", false))
    await act(async () => controls.resetToDefaults())
    expect(rootObject.children).toHaveLength(2)
  })
})

function findMesh(root: THREE.Object3D) {
  let mesh:
    | THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
    | undefined
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) mesh = object as typeof mesh
  })
  if (!mesh) throw new Error("Missing enclosure mesh")
  return mesh
}

test("changing enclosure transparency preserves its geometry", async () => {
  await withScene(async ({ root, rootObject, context }) => {
    const render = (translucent: boolean) =>
      act(async () =>
        root.render(
          <ThreeContext.Provider value={context}>
            <HoverContext.Provider value={hover}>
              <JscadModel
                jscadPlan={plan}
                isTranslucent={translucent}
                isHovered={false}
                onHover={noop}
                onUnhover={noop}
              />
            </HoverContext.Provider>
          </ThreeContext.Provider>,
        ),
      )
    await render(false)
    const geometry = findMesh(rootObject).geometry
    await render(true)
    const translucentMesh = findMesh(rootObject)
    expect(translucentMesh.geometry).toBe(geometry)
    expect(translucentMesh.material.transparent).toBe(true)
    expect(translucentMesh.material.opacity).toBe(0.5)
    expect(translucentMesh.material.map).toBeNull()
    await render(false)
    expect(findMesh(rootObject).geometry).toBe(geometry)
    expect(findMesh(rootObject).material.transparent).toBe(false)
  })
})

test("unmounting enclosure releases geometry and material", async () => {
  await withScene(async ({ root, rootObject, context }) => {
    await act(async () =>
      root.render(
        <ThreeContext.Provider value={context}>
          <HoverContext.Provider value={hover}>
            <JscadModel
              jscadPlan={plan}
              isHovered={false}
              onHover={noop}
              onUnhover={noop}
            />
          </HoverContext.Provider>
        </ThreeContext.Provider>,
      ),
    )
    const mesh = findMesh(rootObject)
    let geometryDisposed = 0,
      materialDisposed = 0
    mesh.geometry.addEventListener("dispose", () => geometryDisposed++)
    mesh.material.addEventListener("dispose", () => materialDisposed++)
    await act(async () => root.render(null))
    expect(rootObject.children).toHaveLength(0)
    expect(geometryDisposed).toBe(1)
    expect(materialDisposed).toBe(1)
  })
})

for (const renderer of ["jscad", "manifold"] as const) {
  test(`${renderer}: enclosure visibility does not rebuild PCB textures, copper visibility does`, async () => {
    const generation = spyOn(textureModule, "createCombinedBoardTextures")
    try {
      await withScene(async ({ root, context }) => {
        let controls: ReturnType<typeof useLayerVisibility>
        function Controls() {
          controls = useLayerVisibility()
          return null
        }
        const data: AnyCircuitElement[] = [
          {
            type: "pcb_board",
            pcb_board_id: "board",
            center: { x: 0, y: 0 },
            width: 2,
            height: 2,
            thickness: 1.6,
            num_layers: 2,
            material: "fr4",
          },
        ]
        function ManifoldTextures() {
          const { visibility } = useLayerVisibility()
          useManifoldBoardBuilder(null, data, visibility)
          return null
        }
        await act(async () =>
          root.render(
            <ThreeContext.Provider value={context}>
              <LayerVisibilityProvider>
                <Controls />
                {renderer === "jscad" ? (
                  <JscadBoardTextures circuitJson={data} pcbThickness={1.6} />
                ) : (
                  <ManifoldTextures />
                )}
              </LayerVisibilityProvider>
            </ThreeContext.Provider>,
          ),
        )
        const initial = generation.mock.calls.length
        expect(initial).toBeGreaterThan(0)
        for (const mode of ["opaque", "hidden", "translucent"] as const) {
          await act(async () => controls!.setLayerVisibility("enclosure", mode))
          expect(generation.mock.calls.length).toBe(initial)
        }
        await act(async () => controls!.setLayerVisibility("topCopper", false))
        expect(generation.mock.calls.length).toBe(initial + 1)
      })
    } finally {
      generation.mockRestore()
    }
  })
}

test("enclosure resources are released on plan replacement and StrictMode replay", async () => {
  const geometryDispose = spyOn(THREE.BufferGeometry.prototype, "dispose")
  const materialDispose = spyOn(THREE.Material.prototype, "dispose")
  try {
    await withScene(async ({ root, rootObject, context }) => {
      const render = (nextPlan: typeof plan) =>
        act(async () =>
          root.render(
            <StrictMode>
              <ThreeContext.Provider value={context}>
                <HoverContext.Provider value={hover}>
                  <JscadModel
                    jscadPlan={nextPlan}
                    isHovered={false}
                    onHover={noop}
                    onUnhover={noop}
                  />
                </HoverContext.Provider>
              </ThreeContext.Provider>
            </StrictMode>,
          ),
        )
      await render(plan)
      expect(geometryDispose.mock.calls.length).toBe(1)
      expect(materialDispose.mock.calls.length).toBe(1)
      const original = findMesh(rootObject)
      let oldGeometryDisposed = false
      original.geometry.addEventListener(
        "dispose",
        () => (oldGeometryDisposed = true),
      )
      await render({ type: "cuboid", size: [20, 8, 4] })
      expect(oldGeometryDisposed).toBe(true)
      expect(findMesh(rootObject).geometry === original.geometry).toBe(false)
      expect(geometryDispose.mock.calls.length).toBe(2)
      await act(async () => root.render(null))
      expect(geometryDispose.mock.calls.length).toBe(3)
      expect(materialDispose.mock.calls.length).toBe(3)
    })
  } finally {
    geometryDispose.mockRestore()
    materialDispose.mockRestore()
  }
})

async function renderColoredJscadModel({
  root,
  context,
  coloredPlan,
  color,
  isTranslucent = false,
}: {
  root: ReturnType<typeof createRoot>
  context: ThreeContextState
  coloredPlan: ComponentProps<typeof JscadModel>["jscadPlan"]
  color?: string
  isTranslucent?: boolean
}) {
  await act(async () =>
    root.render(
      <ThreeContext.Provider value={context}>
        <HoverContext.Provider value={hover}>
          <JscadModel
            jscadPlan={coloredPlan}
            color={color}
            isTranslucent={isTranslucent}
            isHovered={false}
            onHover={noop}
            onUnhover={noop}
          />
        </HoverContext.Provider>
      </ThreeContext.Provider>,
    ),
  )
}

test("JSCAD color override replaces embedded color and restores it when cleared", async () => {
  await withScene(async ({ root, rootObject, context }) => {
    const coloredPlan = {
      type: "colorize" as const,
      color: [0, 0, 1] as [number, number, number],
      shape: plan,
    }
    const renderContext = { root, context, coloredPlan }
    await renderColoredJscadModel(renderContext)
    const mesh = findMesh(rootObject)
    const geometry = mesh.geometry
    const colors = geometry.getAttribute("color")
    expect([colors.getX(0), colors.getY(0), colors.getZ(0)]).toEqual([0, 0, 1])
    expect(mesh.material.vertexColors).toBe(true)

    await renderColoredJscadModel({ ...renderContext, color: "#d73e39" })
    expect(findMesh(rootObject).geometry).toBe(geometry)
    expect(mesh.material.color.getHexString()).toBe("d73e39")
    expect(mesh.material.vertexColors).toBe(false)

    await renderColoredJscadModel({
      ...renderContext,
      color: "#00ff00",
      isTranslucent: true,
    })
    expect(mesh.material.color.getHexString()).toBe("00ff00")
    expect(mesh.material.opacity).toBe(0.5)
    expect(mesh.material.vertexColors).toBe(false)

    await renderColoredJscadModel(renderContext)
    expect(findMesh(rootObject).geometry).toBe(geometry)
    expect(mesh.material.vertexColors).toBe(true)
    expect(mesh.material.color.getHexString()).toBe("ffffff")
    expect(mesh.material.opacity).toBe(1)
    expect(geometry.getAttribute("color")).toBe(colors)
  })
})
