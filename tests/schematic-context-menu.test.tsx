import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { useRef, useState } from "react"
import { useContextMenu } from "../src/hooks/useContextMenu"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { AppearanceProvider } from "../src/contexts/appearance-context"
import { CameraControllerProvider } from "../src/contexts/CameraControllerContext"
import { LayerVisibilityProvider } from "../src/contexts/LayerVisibilityContext"

test("schematic action snapshots the right-click, closes, and is optional", async () => {
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

  const selected: Array<{ x: number; y: number }> = []
  const Harness = ({ enabled = true }: { enabled?: boolean }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const menu = useContextMenu({ containerRef, onOpen: setPosition })
    return (
      <div ref={containerRef} data-viewer {...menu.contextMenuEventHandlers}>
        {menu.menuVisible && (
          <ContextMenu
            menuRef={menu.menuRef}
            menuPos={menu.menuPos}
            engine="manifold"
            cameraPreset="Custom"
            autoRotate={false}
            onEngineSwitch={() => {}}
            onCameraPresetSelect={() => {}}
            onAutoRotateToggle={() => {}}
            onDownloadGltf={() => {}}
            onOpenKeyboardShortcuts={() => {}}
            onViewSchematicComponent={
              enabled
                ? () => {
                    selected.push(position)
                    menu.setMenuVisible(false)
                  }
                : undefined
            }
          />
        )}
      </div>
    )
  }
  const container = document.getElementById("root")!
  const reactRoot = createRoot(container)

  try {
    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <LayerVisibilityProvider>
            <AppearanceProvider>
              <Harness />
            </AppearanceProvider>
          </LayerVisibilityProvider>
        </CameraControllerProvider>,
      )
    })
    const viewer = document.querySelector("[data-viewer]")!
    const rightClick = async (endX = 80) => {
      await act(async () => {
        viewer.dispatchEvent(
          new dom.window.MouseEvent("mousedown", {
            bubbles: true,
            button: 2,
            clientX: 80,
            clientY: 90,
          }),
        )
        viewer.dispatchEvent(
          new dom.window.MouseEvent("contextmenu", {
            bubbles: true,
            button: 2,
            clientX: endX,
            clientY: 90,
          }),
        )
      })
    }
    await rightClick(120)
    expect(document.querySelector('[role="menu"]')).toBeNull()
    await rightClick()
    await act(
      () => new Promise<void>((resolve) => dom.window.setTimeout(resolve, 0)),
    )
    const action = Array.from(
      document.querySelectorAll('[role="menuitem"]'),
    ).find((element) => element.textContent === "Show on schematic")!
    expect(action).toBeDefined()
    await act(async () => {
      action.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true }),
      )
    })
    expect(selected).toEqual([{ x: 80, y: 90 }])
    expect(document.querySelector('[role="menu"]')).toBeNull()
    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <LayerVisibilityProvider>
            <AppearanceProvider>
              <Harness enabled={false} />
            </AppearanceProvider>
          </LayerVisibilityProvider>
        </CameraControllerProvider>,
      )
    })
    await rightClick()
    await act(
      () => new Promise<void>((resolve) => dom.window.setTimeout(resolve, 0)),
    )
    expect(document.querySelector('[role="menu"]')).not.toBeNull()
    expect(document.body.textContent).not.toContain("Show on schematic")
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
