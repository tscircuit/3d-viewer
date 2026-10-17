import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { AppearanceProvider } from "../src/contexts/appearance-context"
import { CameraControllerProvider } from "../src/contexts/CameraControllerContext"
import { LayerVisibilityProvider } from "../src/contexts/LayerVisibilityContext"

test("Download submenu supports keyboard selection and disables unavailable formats", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" })
  const values = {
    window: dom.window,
    document: dom.window.document,
    Element: dom.window.Element,
    Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent,
    HTMLElement: dom.window.HTMLElement,
    MutationObserver: dom.window.MutationObserver,
    Node: dom.window.Node,
    getComputedStyle: dom.window.getComputedStyle,
    ResizeObserver: class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
    IS_REACT_ACT_ENVIRONMENT: true,
  }
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, (globalThis as any)[key]]),
  )
  Object.assign(globalThis, values)
  const { ContextMenu } = await import("../src/components/ContextMenu")
  const root = createRoot(document.getElementById("root")!)
  const downloads: string[] = []
  try {
    await act(async () => {
      root.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <LayerVisibilityProvider>
            <AppearanceProvider>
              <ContextMenu
                menuRef={{ current: null }}
                menuPos={{ x: 20, y: 20 }}
                engine="manifold"
                cameraPreset="Custom"
                autoRotate={false}
                onEngineSwitch={() => {}}
                onCameraPresetSelect={() => {}}
                onAutoRotateToggle={() => {}}
                onDownloadGltf={() => downloads.push("board")}
                onOpenKeyboardShortcuts={() => {}}
                modelDownloads={{ GLB: true, STEP: false, x_t: false }}
                onDownloadModel={(format) => downloads.push(format)}
              />
            </AppearanceProvider>
          </LayerVisibilityProvider>
        </CameraControllerProvider>,
      )
    })
    const trigger = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ).find((el) => el.textContent === "Download")!
    expect(trigger).toBeDefined()
    expect(document.body.textContent).not.toContain("Download GLTF")
    await act(async () => {
      trigger.focus()
      trigger.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
        }),
      )
    })
    const items = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    )
    const step = items.find((el) => el.textContent === "STEP")!
    const xt = items.find((el) => el.textContent === "x_t")!
    expect(step.getAttribute("aria-disabled")).toBe("true")
    expect(xt.getAttribute("aria-disabled")).toBe("true")
    expect(step.style.opacity).toBe("0.4")
    await act(async () => {
      step.click()
      xt.click()
    })
    expect(downloads).toEqual([])
    const glb = items.find((el) => el.textContent === "GLB")!
    await act(async () => {
      glb.focus()
      glb.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
        }),
      )
    })
    expect(downloads).toEqual(["GLB"])
  } finally {
    await act(async () => root.unmount())
    await new Promise<void>((resolve) => dom.window.setTimeout(resolve, 0))
    dom.window.close()
    Object.assign(globalThis, previous)
  }
})
