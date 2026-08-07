import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { createRef } from "react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import {
  AppearanceProvider,
  useAppearance,
} from "../src/contexts/appearance-context"
import { CameraControllerProvider } from "../src/contexts/CameraControllerContext"
import { LayerVisibilityProvider } from "../src/contexts/LayerVisibilityContext"

const GridStateProbe = () => {
  const { gridEnabled } = useAppearance()
  return <div data-grid-enabled={gridEnabled} />
}

test("Show Grid toggles the grid appearance setting", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost",
  })
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    Element: globalThis.Element,
    Event: globalThis.Event,
    CustomEvent: globalThis.CustomEvent,
    HTMLElement: globalThis.HTMLElement,
    MutationObserver: globalThis.MutationObserver,
    Node: globalThis.Node,
    getComputedStyle: globalThis.getComputedStyle,
  }

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Element: dom.window.Element,
    Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent,
    HTMLElement: dom.window.HTMLElement,
    MutationObserver: dom.window.MutationObserver,
    Node: dom.window.Node,
    getComputedStyle: dom.window.getComputedStyle,
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  const { ContextMenu } = await import("../src/components/ContextMenu")

  const container = document.getElementById("root")!
  const reactRoot = createRoot(container)

  try {
    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <LayerVisibilityProvider>
            <AppearanceProvider>
              <ContextMenu
                menuRef={createRef<HTMLDivElement>()}
                menuPos={{ x: 0, y: 0 }}
                engine="manifold"
                cameraPreset="Custom"
                autoRotate={false}
                onEngineSwitch={() => {}}
                onCameraPresetSelect={() => {}}
                onAutoRotateToggle={() => {}}
                onDownloadGltf={() => {}}
                onOpenKeyboardShortcuts={() => {}}
              />
              <GridStateProbe />
            </AppearanceProvider>
          </LayerVisibilityProvider>
        </CameraControllerProvider>,
      )
    })

    const stateProbe = document.querySelector("[data-grid-enabled]")!
    expect(stateProbe.getAttribute("data-grid-enabled")).toBe("false")

    await act(
      () => new Promise<void>((resolve) => dom.window.setTimeout(resolve, 0)),
    )

    const showGridLabel = Array.from(document.querySelectorAll("span")).find(
      (element) => element.textContent === "Show Grid",
    )
    expect(showGridLabel).toBeDefined()

    const showGridItem = showGridLabel!.closest('[role="menuitem"]')!
    await act(async () => {
      showGridItem.dispatchEvent(
        new dom.window.Event("pointerdown", {
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    expect(stateProbe.getAttribute("data-grid-enabled")).toBe("true")
    expect(showGridItem.querySelector("svg")).not.toBeNull()

    await act(async () => {
      showGridItem.dispatchEvent(
        new dom.window.Event("pointerdown", {
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    expect(stateProbe.getAttribute("data-grid-enabled")).toBe("false")
    expect(showGridItem.querySelector("svg")).toBeNull()
  } finally {
    await act(async () => reactRoot.unmount())
    await new Promise<void>((resolve) => dom.window.setTimeout(resolve, 0))
    Object.assign(globalThis, {
      ...previousGlobals,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
