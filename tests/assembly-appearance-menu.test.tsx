import { expect, test } from "bun:test"
import { cad_component, type AnyCircuitElement } from "circuit-json"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { AppearanceProvider } from "../src/contexts/appearance-context"
import { LayerVisibilityProvider } from "../src/contexts/LayerVisibilityContext"

test("Assembly menu is available only for circuits with standalone CAD", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" })
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
    ResizeObserver: globalThis.ResizeObserver,
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
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  const DropdownMenu = await import("@radix-ui/react-dropdown-menu")
  const { AppearanceMenu } = await import("../src/components/AppearanceMenu")
  const root = createRoot(document.getElementById("root")!)
  const render = async (circuitJson: AnyCircuitElement[]) => {
    await act(async () => {
      root.render(
        <LayerVisibilityProvider>
          <AppearanceProvider>
            <DropdownMenu.Root open>
              <DropdownMenu.Content>
                <AppearanceMenu circuitJson={circuitJson} />
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </AppearanceProvider>
        </LayerVisibilityProvider>,
      )
    })
  }
  try {
    await render([])
    const appearance = Array.from(
      document.querySelectorAll('[role="menuitem"]'),
    ).find((item) => item.textContent === "Appearance")!
    await act(async () => {
      appearance.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
        }),
      )
    })
    expect(document.body.textContent).toContain("Enclosure")
    expect(document.body.textContent).not.toContain("Assembly")

    const mountedCad = cad_component.parse({
      type: "cad_component",
      cad_component_id: "mounted",
      source_component_id: "source_component",
      pcb_component_id: "pcb_component",
      position: { x: 0, y: 0, z: 0 },
    })
    await render([mountedCad])
    expect(document.body.textContent).not.toContain("Assembly")

    const standaloneCad = cad_component.parse({
      ...mountedCad,
      cad_component_id: "mechanical",
      pcb_component_id: undefined,
    })
    await render([mountedCad, standaloneCad])
    const assembly = Array.from(
      document.querySelectorAll('[role="menuitem"]'),
    ).find((item) => item.textContent === "Assembly")!
    expect(assembly).toBeDefined()
    expect(assembly.querySelector("svg")).not.toBeNull()
    await act(async () => {
      assembly.dispatchEvent(
        new dom.window.MouseEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    expect(assembly.isConnected).toBe(true)
    expect(assembly.querySelector("svg")).toBeNull()

    await render([mountedCad])
    expect(document.body.textContent).not.toContain("Assembly")
  } finally {
    await act(async () => root.unmount())
    await new Promise<void>((resolve) => dom.window.setTimeout(resolve, 0))
    Object.assign(globalThis, {
      ...previousGlobals,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
