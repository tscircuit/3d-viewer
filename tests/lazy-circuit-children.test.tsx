import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act, createElement, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { useConvertChildrenToCircuitJson } from "../src/hooks/use-convert-children-to-soup"

test("on-demand TSX conversion renders new children and clears stale circuit data", async () => {
  const dom = new JSDOM('<div id="root"></div>')
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
  let json: ReturnType<typeof useConvertChildrenToCircuitJson> = []
  function Harness({ child }: { child?: ReactNode }) {
    json = useConvertChildrenToCircuitJson(child)
    return null
  }
  const root = createRoot(document.getElementById("root")!)
  try {
    await act(async () => root.render(<Harness />))
    expect(json).toEqual([])
    for (const width of [10, 20]) {
      await act(async () =>
        root.render(
          <Harness child={createElement("board", { width, height: 5 })} />,
        ),
      )
      for (let attempt = 0; attempt < 50 && !json.length; attempt++) {
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
        })
      }
      expect(json.find((element) => element.type === "pcb_board")?.width).toBe(
        width,
      )
    }
    await act(async () => root.render(<Harness />))
    expect(json).toEqual([])
  } finally {
    await act(async () => root.unmount())
    Object.assign(globalThis, previous)
    dom.window.close()
  }
})
