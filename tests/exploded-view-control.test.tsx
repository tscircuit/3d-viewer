import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"

test("exploded-view slider reports its percentage and changes the amount", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" })
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    Event: globalThis.Event,
    HTMLElement: globalThis.HTMLElement,
  }
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Event: dom.window.Event,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  const { ExplodedViewControl } = await import(
    "../src/components/ExplodedViewControl"
  )
  const container = document.getElementById("root")!
  const reactRoot = createRoot(container)
  let changedAmount = 0

  try {
    await act(async () => {
      reactRoot.render(
        <ExplodedViewControl
          explodedViewAmount={0.35}
          onExplodedViewAmountChange={(explodedViewAmount) => {
            changedAmount = explodedViewAmount
          }}
        />,
      )
    })

    const slider = document.querySelector<HTMLInputElement>(
      '[data-testid="explode-slider"]',
    )!
    expect(slider.getAttribute("aria-valuetext")).toBe("35% exploded")
    expect(document.querySelector("output")?.textContent).toBe("35%")

    const rangeValueSetter = Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype,
      "value",
    )!.set!
    await act(async () => {
      rangeValueSetter.call(slider, "72")
      slider.dispatchEvent(new dom.window.Event("input", { bubbles: true }))
    })
    expect(changedAmount).toBe(0.72)
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, {
      ...previousGlobals,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
