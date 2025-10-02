import { expect, mock, test } from "bun:test"
import { JSDOM } from "jsdom"
import { createRoot } from "react-dom/client"
import { act } from "react-dom/test-utils"
import type { ComponentType } from "react"

interface StubRenderer {
  domElement: HTMLCanvasElement
  outputColorSpace: any
  toneMapping: any
  toneMappingExposure: number
  setSize: (width: number, height: number) => void
  setPixelRatio: (ratio: number) => void
  render: (scene: any, camera: any) => void
  dispose: () => void
}

const rendererStore: StubRenderer[] = []
;(globalThis as any).__REMOTE_GLB_RENDERERS__ = rendererStore

mock.module("troika-three-text", () => {
  class MockTroikaText {
    text = ""
    color: any
    fontSize = 1
    anchorX: string = "center"
    anchorY: string = "middle"
    depthOffset = 0
    font: any = null
    position = { fromArray: () => {} }
    rotation = { fromArray: () => {} }
    scale = { fromArray: () => {} }
    sync = () => {}
    dispose = () => {}
  }

  return {
    Text: MockTroikaText,
    preloadFont: async () => {},
  }
})

mock.module("../../src/react-three/Canvas.tsx", async () => {
  const React = await import("react")
  const THREE = await import("three")
  const { ThreeContext } = await import("../../src/react-three/ThreeContext.ts")
  const { HoverProvider } = await import(
    "../../src/react-three/HoverContext.tsx"
  )
  const { configureRenderer } = await import(
    "../../src/react-three/configure-renderer.ts"
  )

  const {
    useEffect,
    useMemo,
    useRef,
    useState,
    forwardRef,
    useImperativeHandle,
  } = React

  const Canvas = forwardRef<any, React.PropsWithChildren<{}>>(
    ({ children }, ref) => {
      const [contextValue, setContextValue] = useState<any>(null)
      const rootObjectRef = useRef(new THREE.Object3D())

      useImperativeHandle(ref, () => rootObjectRef.current)

      useEffect(() => {
        const renderer: StubRenderer = {
          domElement: window.document.createElement("canvas"),
          outputColorSpace: null,
          toneMapping: null,
          toneMappingExposure: 0,
          setSize: () => {},
          setPixelRatio: () => {},
          render: () => {},
          dispose: () => {},
        }

        configureRenderer(renderer as any)
        ;((globalThis as any).__REMOTE_GLB_RENDERERS__ as StubRenderer[]).push(
          renderer,
        )

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera()

        setContextValue({
          scene,
          camera,
          renderer: renderer as any,
          rootObject: rootObjectRef.current,
          addFrameListener: () => {},
          removeFrameListener: () => {},
        })
      }, [])

      const content = useMemo(() => {
        if (!contextValue) return null
        return (
          <ThreeContext.Provider value={contextValue}>
            <HoverProvider>{children}</HoverProvider>
          </ThreeContext.Provider>
        )
      }, [children, contextValue])

      return <div data-testid="mock-canvas">{content}</div>
    },
  )

  Canvas.displayName = "MockCanvas"

  return { Canvas }
})

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const waitFor = async (predicate: () => boolean, timeout = 500, step = 10) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (predicate()) return
    await wait(step)
  }
  throw new Error("Timed out waiting for condition")
}

test("remote GLB story configures the renderer for bright output", async () => {
  rendererStore.length = 0

  const dom = new JSDOM(
    "<!DOCTYPE html><html><body><div id='root'></div></body></html>",
    { url: "https://localhost", pretendToBeVisual: true },
  )

  const originalGlobals = {
    window: globalThis.window as any,
    document: globalThis.document as any,
    navigator: globalThis.navigator as any,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    devicePixelRatio: globalThis.devicePixelRatio,
    HTMLElement: globalThis.HTMLElement as any,
    HTMLCanvasElement: globalThis.HTMLCanvasElement as any,
    localStorage: (globalThis as any).localStorage as any,
  }

  const { window } = dom
  Object.assign(globalThis, {
    window,
    document: window.document,
    navigator: window.navigator,
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    devicePixelRatio: 1,
    HTMLElement: window.HTMLElement,
    HTMLCanvasElement: window.HTMLCanvasElement,
    localStorage: window.localStorage,
  })

  window.requestAnimationFrame = globalThis.requestAnimationFrame
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame
  window.localStorage.setItem("cadViewerEngine", "jscad")

  const THREE = await import("three")
  const { GLTFLoader } = await import("three-stdlib")
  const originalLoad = GLTFLoader.prototype.load
  GLTFLoader.prototype.load = function (_url, onLoad) {
    const group = new THREE.Group()
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial(),
    )
    group.add(mesh)
    setTimeout(() => {
      onLoad?.({ scene: group } as any)
    }, 0)
    return undefined as any
  }

  const cleanup = () => {
    GLTFLoader.prototype.load = originalLoad
    if (originalGlobals.window) {
      globalThis.window = originalGlobals.window
    } else {
      delete (globalThis as any).window
    }
    if (originalGlobals.document) {
      globalThis.document = originalGlobals.document
    } else {
      delete (globalThis as any).document
    }
    if (originalGlobals.navigator) {
      globalThis.navigator = originalGlobals.navigator
    } else {
      delete (globalThis as any).navigator
    }
    if (originalGlobals.requestAnimationFrame) {
      globalThis.requestAnimationFrame = originalGlobals.requestAnimationFrame
    } else {
      delete (globalThis as any).requestAnimationFrame
    }
    if (originalGlobals.cancelAnimationFrame) {
      globalThis.cancelAnimationFrame = originalGlobals.cancelAnimationFrame
    } else {
      delete (globalThis as any).cancelAnimationFrame
    }
    if (originalGlobals.devicePixelRatio !== undefined) {
      globalThis.devicePixelRatio = originalGlobals.devicePixelRatio
    } else {
      delete (globalThis as any).devicePixelRatio
    }
    if (originalGlobals.HTMLElement) {
      globalThis.HTMLElement = originalGlobals.HTMLElement
    } else {
      delete (globalThis as any).HTMLElement
    }
    if (originalGlobals.HTMLCanvasElement) {
      globalThis.HTMLCanvasElement = originalGlobals.HTMLCanvasElement
    } else {
      delete (globalThis as any).HTMLCanvasElement
    }
    if (originalGlobals.localStorage) {
      ;(globalThis as any).localStorage = originalGlobals.localStorage
    } else {
      delete (globalThis as any).localStorage
    }
  }

  try {
    const { composeStories } = await import("@storybook/react")
    const RemoteGlbStories = await import(
      "../../stories/Bugs/RemoteGlbBrightness.stories"
    )
    const { RemoteSoic6Glb } = composeStories(RemoteGlbStories as any) as {
      RemoteSoic6Glb: ComponentType
    }

    const container = window.document.getElementById("root")
    if (!container) throw new Error("Failed to locate root container")

    const root = createRoot(container)

    await act(async () => {
      root.render(<RemoteSoic6Glb />)
      await wait(10)
    })

    expect(rendererStore.length).toBeGreaterThan(0)
    await waitFor(() =>
      rendererStore.some((renderer) => renderer.toneMappingExposure === 1.6),
    )
    const renderer = rendererStore.find(
      (entry) => entry.toneMappingExposure === 1.6,
    )!
    expect(renderer.outputColorSpace).toBe(THREE.SRGBColorSpace)
    expect(renderer.toneMapping).toBe(THREE.ACESFilmicToneMapping)
    // exposure is increased while the GLB-backed component is mounted
    expect(renderer.toneMappingExposure).toBe(1.6)

    await act(async () => {
      root.unmount()
    })

    // and returns to the shared default after unmounting
    await waitFor(() => renderer.toneMappingExposure === 1)
    expect(renderer.toneMappingExposure).toBe(1)
  } finally {
    cleanup()
  }
})
