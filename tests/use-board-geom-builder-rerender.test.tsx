import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { useBoardGeomBuilder } from "../src/hooks/useBoardGeomBuilder"

const makeCircuitJson = (idOffset: number) =>
  [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    // Several plated holes so the detailed build takes many steps and stays
    // in flight while the next render commits.
    ...Array.from({ length: 10 }, (_, i) => ({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: `hole-${idOffset}-${i}`,
      pcb_component_id: "component",
      shape: "circle",
      x: -3 + i * 0.5,
      y: 0,
      hole_diameter: 0.3,
      outer_diameter: 0.5,
      layers: ["top", "bottom"],
    })),
  ] as any

test("rebuilds detailed geometry when circuitJson changes mid build", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://3d-viewer.test",
  })
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
  }
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  let latestGeoms: Geom3[] | null = null
  const Harness = ({ circuitJson }: { circuitJson: any }) => {
    latestGeoms = useBoardGeomBuilder(circuitJson)
    return null
  }

  const reactRoot = createRoot(document.getElementById("root")!)

  try {
    await act(async () => {
      reactRoot.render(<Harness circuitJson={makeCircuitJson(1)} />)
    })

    // The first detailed build is now in flight (suspended inside its async
    // step loop). Swap the circuit json before it finishes.
    await act(async () => {
      reactRoot.render(<Harness circuitJson={makeCircuitJson(2)} />)
    })

    await act(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 500)
        }),
    )

    expect(latestGeoms).not.toBeNull()
    // The detailed build emits one geom per plated hole plus the board. The
    // simplified fallback is a single board cuboid, so a count of 1 means the
    // detailed build for the new circuit json never ran.
    expect(latestGeoms!.length).toBeGreaterThan(1)
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, {
      ...previousGlobals,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
