import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { useRef, useState } from "react"
import { useContextMenu } from "../src/hooks/useContextMenu"
import { useObjectVisibility } from "../src/hooks/useObjectVisibility"
import {
  hasHiddenObjects,
  isObjectHidden,
} from "../src/utils/object-visibility"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { AppearanceProvider } from "../src/contexts/appearance-context"
import { CameraControllerProvider } from "../src/contexts/CameraControllerContext"
import { LayerVisibilityProvider } from "../src/contexts/LayerVisibilityContext"

test("component actions snapshot the right-click, close, and restore hidden or isolated models", async () => {
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
  const Harness = ({
    enabled = true,
    circuitKey = "first",
  }: {
    enabled?: boolean
    circuitKey?: string
  }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const menu = useContextMenu({ containerRef, onOpen: setPosition })
    const { objectVisibility, hideObject, isolateObject, unhideAllObjects } =
      useObjectVisibility(circuitKey)
    const componentId = position.x === 80 ? "case" : "r1"
    const componentName = componentId === "case" ? "CASE" : "R1"
    const canHide =
      position.x > 0 && !isObjectHidden(objectVisibility, componentId)
    return (
      <div
        ref={containerRef}
        data-viewer
        data-hidden={Array.from(objectVisibility.hiddenIds).join(",")}
        data-isolated={objectVisibility.isolatedId ?? ""}
        {...menu.contextMenuEventHandlers}
      >
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
            objectName={componentName}
            onHideObject={
              canHide
                ? () => {
                    hideObject(componentId)
                    menu.setMenuVisible(false)
                  }
                : undefined
            }
            onIsolateObject={
              canHide && objectVisibility.isolatedId !== componentId
                ? () => {
                    isolateObject(componentId)
                    menu.setMenuVisible(false)
                  }
                : undefined
            }
            onUnhideAll={
              hasHiddenObjects(objectVisibility)
                ? () => {
                    unhideAllObjects()
                    menu.setMenuVisible(false)
                  }
                : undefined
            }
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
    const rightClick = async (endX = 80, startX = 80) => {
      await act(async () => {
        viewer.dispatchEvent(
          new dom.window.MouseEvent("mousedown", {
            bubbles: true,
            button: 2,
            clientX: startX,
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
    const select = async (text: string, keyboard = false) => {
      await act(
        () => new Promise<void>((resolve) => dom.window.setTimeout(resolve, 0)),
      )
      const item = Array.from(
        document.querySelectorAll('[role="menuitem"]'),
      ).find((element) => element.textContent === text)!
      expect(item).toBeDefined()
      await act(async () => {
        if (keyboard) {
          ;(item as HTMLElement).focus()
          item.dispatchEvent(
            new dom.window.KeyboardEvent("keydown", {
              key: "Enter",
              bubbles: true,
            }),
          )
        } else {
          item.dispatchEvent(
            new dom.window.MouseEvent("click", { bubbles: true }),
          )
        }
      })
      expect(document.querySelector('[role="menu"]')).toBeNull()
    }
    await rightClick()
    expect(document.body.textContent).not.toContain("Unhide All")
    await select('Hide "CASE"', true)
    expect(viewer.getAttribute("data-hidden")).toBe("case")
    await rightClick(40, 40)
    await select('Hide "R1"')
    expect(viewer.getAttribute("data-hidden")).toBe("case,r1")
    await rightClick(0, 0)
    expect(document.body.textContent).not.toContain('Hide "')
    await select("Unhide All", true)
    expect(viewer.getAttribute("data-hidden")).toBe("")
    await rightClick()
    expect(document.body.textContent).not.toContain("Unhide All")
    await select('Isolate "CASE"')
    expect(viewer.getAttribute("data-isolated")).toBe("case")
    expect(viewer.getAttribute("data-hidden")).toBe("")
    // Isolating CASE hides R1, so it can no longer be picked.
    await rightClick(40, 40)
    expect(document.body.textContent).not.toContain('Hide "')
    expect(document.body.textContent).not.toContain('Isolate "')
    await select("Unhide All")
    expect(viewer.getAttribute("data-isolated")).toBe("")
    await rightClick()
    await select('Isolate "CASE"')
    await rightClick()
    expect(document.body.textContent).toContain('Hide "CASE"')
    expect(document.body.textContent).not.toContain('Isolate "')
    await select("Unhide All", true)
    expect(viewer.getAttribute("data-isolated")).toBe("")
    await rightClick()
    await select('Hide "CASE"')
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
    expect(document.body.textContent).not.toContain('Hide "')
    // Hiding is independent of optional schematic navigation and remains on a rerender.
    await select("Unhide All")
    expect(viewer.getAttribute("data-hidden")).toBe("")
    await rightClick()
    expect(document.body.textContent).not.toContain("Show on schematic")
    await select('Hide "CASE"')
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
    await rightClick()
    await select("Unhide All")
    await rightClick()
    await select('Hide "CASE"')
    await act(async () => {
      reactRoot.render(
        <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
          <LayerVisibilityProvider>
            <AppearanceProvider>
              <Harness circuitKey="second" />
            </AppearanceProvider>
          </LayerVisibilityProvider>
        </CameraControllerProvider>,
      )
    })
    expect(viewer.getAttribute("data-hidden")).toBe("")
    await rightClick()
    expect(document.body.textContent).not.toContain("Unhide All")
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
