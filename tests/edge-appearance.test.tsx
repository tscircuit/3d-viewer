import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import {
  AppearanceProvider,
  useAppearance,
} from "../src/contexts/appearance-context"
import { LayerVisibilityProvider } from "../src/contexts/LayerVisibilityContext"

const StateProbe = ({ id }: { id: string }) => {
  const appearance = useAppearance()
  return (
    <>
      <output
        data-probe={id}
        data-edge-mode={appearance.edgeMode}
        data-edge-width={appearance.edgeWidth}
        data-grid={appearance.gridEnabled}
        data-lighting={appearance.lightingEnabled}
      />
      <button
        type="button"
        data-seed={id}
        onClick={() => {
          appearance.setGridEnabled(true)
          appearance.setLightingEnabled(false)
          appearance.setEdgeMode("hidden")
          appearance.setEdgeWidth(5)
        }}
      >
        Change appearance
      </button>
    </>
  )
}

const withDom = async (
  run: (dom: JSDOM, root: ReturnType<typeof createRoot>) => Promise<void>,
) => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost",
    pretendToBeVisual: true,
  })
  const globals = {
    window: dom.window,
    document: dom.window.document,
    Element: dom.window.Element,
    Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    MutationObserver: dom.window.MutationObserver,
    Node: dom.window.Node,
    NodeFilter: dom.window.NodeFilter,
    getComputedStyle: dom.window.getComputedStyle,
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
  }
  const previous = Object.fromEntries(
    Object.keys(globals).map((key) => [key, Reflect.get(globalThis, key)]),
  )
  Object.assign(globalThis, globals)
  const root = createRoot(dom.window.document.getElementById("root")!)
  try {
    await run(dom, root)
  } finally {
    await act(async () => root.unmount())
    await new Promise<void>((resolve) => dom.window.setTimeout(resolve, 0))
    Object.assign(globalThis, previous)
    dom.window.close()
  }
}

const settle = async (dom: JSDOM) => {
  await act(
    () => new Promise<void>((resolve) => dom.window.setTimeout(resolve, 0)),
  )
}

const keyDown = async (dom: JSDOM, element: Element, key: string) => {
  await act(async () => {
    element.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      }),
    )
  })
  await settle(dom)
}

test("edge controls are keyboard accessible without PCB layer controls", async () => {
  await withDom(async (dom, root) => {
    const DropdownMenu = await import("@radix-ui/react-dropdown-menu")
    const { AppearanceMenu } = await import("../src/components/AppearanceMenu")
    await act(async () => {
      root.render(
        <LayerVisibilityProvider>
          <AppearanceProvider>
            <DropdownMenu.Root defaultOpen modal={false}>
              <DropdownMenu.Trigger>Viewer options</DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content>
                  <AppearanceMenu showLayerControls={false} />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <StateProbe id="viewer" />
          </AppearanceProvider>
        </LayerVisibilityProvider>,
      )
    })
    await settle(dom)
    const probe = document.querySelector('[data-probe="viewer"]')!
    expect(probe.getAttribute("data-edge-mode")).toBe("off")
    expect(probe.getAttribute("data-edge-width")).toBe("2")
    await act(async () => {
      document.querySelector<HTMLButtonElement>('[data-seed="viewer"]')!.click()
    })
    expect(probe.getAttribute("data-grid")).toBe("true")
    expect(probe.getAttribute("data-lighting")).toBe("false")

    const getItem = (label: string) => {
      const item = Array.from(
        document.querySelectorAll('[role="menuitem"]'),
      ).find((element) => element.textContent === label)
      expect(item).toBeDefined()
      return item as HTMLElement
    }
    await keyDown(dom, getItem("Appearance"), "ArrowRight")
    expect(document.body.textContent).not.toContain("Board Body")
    await keyDown(dom, getItem("Edges"), "ArrowRight")

    const radios = () =>
      Array.from(document.querySelectorAll('[role="menuitemradio"]'))
    const hidden = radios().find(
      (element) => element.textContent === "Visible and hidden",
    )!
    expect(hidden.getAttribute("aria-checked")).toBe("true")
    const visible = radios().find(
      (element) => element.textContent === "Visible",
    )!
    await keyDown(dom, visible, "Enter")
    expect(probe.getAttribute("data-edge-mode")).toBe("visible")
    expect(visible.getAttribute("aria-checked")).toBe("true")
    const off = radios().find((element) => element.textContent === "Off")!
    await keyDown(dom, off, " ")
    expect(probe.getAttribute("data-edge-mode")).toBe("off")
    await keyDown(dom, off, "ArrowLeft")

    const widthTrigger = Array.from(
      document.querySelectorAll('[role="menuitem"]'),
    ).find((element) => element.textContent?.startsWith("Edge width"))!
    await keyDown(dom, widthTrigger, "ArrowRight")
    const width = radios().find((element) => element.textContent === "3 px")!
    expect(width).toBeDefined()
    await keyDown(dom, width, "Enter")
    expect(probe.getAttribute("data-edge-width")).toBe("3")
    expect(width.getAttribute("aria-checked")).toBe("true")
    expect(probe.getAttribute("data-edge-mode")).toBe("off")
    expect(probe.getAttribute("data-grid")).toBe("true")
    expect(probe.getAttribute("data-lighting")).toBe("false")
  })
})

test("edge settings are independent for separate viewer providers", async () => {
  await withDom(async (_dom, root) => {
    await act(async () => {
      root.render(
        <>
          <AppearanceProvider>
            <StateProbe id="first" />
          </AppearanceProvider>
          <AppearanceProvider>
            <StateProbe id="second" />
          </AppearanceProvider>
        </>,
      )
    })
    await act(async () => {
      document.querySelector<HTMLButtonElement>('[data-seed="first"]')!.click()
    })
    const first = document.querySelector('[data-probe="first"]')!
    const second = document.querySelector('[data-probe="second"]')!
    expect(first.getAttribute("data-edge-mode")).toBe("hidden")
    expect(first.getAttribute("data-edge-width")).toBe("5")
    expect(second.getAttribute("data-edge-mode")).toBe("off")
    expect(second.getAttribute("data-edge-width")).toBe("2")
    expect(second.getAttribute("data-grid")).toBe("false")
    expect(second.getAttribute("data-lighting")).toBe("true")
  })
})
