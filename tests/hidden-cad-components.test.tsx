import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { useHiddenCadComponents } from "../src/hooks/useHiddenCadComponents"
import { getHiddenCadComponents } from "../src/utils/get-hidden-cad-components"

const circuitJson: AnyCircuitElement[] = [
  {
    type: "source_component",
    source_component_id: "case",
    ftype: "simple_chip",
    name: "Enclosure",
  },
  ...["base", "lid", "unnamed"].map(
    (cadComponentId): AnyCircuitElement => ({
      type: "cad_component",
      cad_component_id: cadComponentId,
      source_component_id: cadComponentId === "unnamed" ? "missing" : "case",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      anchor_alignment: "center",
      model_object_fit: "contain_within_bounds",
    }),
  ),
]

test("lists only hidden CAD objects, including mechanical parts without PCB owners", () => {
  const before = JSON.stringify(circuitJson)
  expect(
    getHiddenCadComponents({
      circuitJson,
      hiddenCadComponentIds: new Set(["lid", "not-in-circuit"]),
    }),
  ).toEqual([{ cad_component_id: "lid", componentName: "Enclosure" }])
  expect(
    getHiddenCadComponents({ circuitJson, hiddenCadComponentIds: new Set() }),
  ).toEqual([])
  expect(JSON.stringify(circuitJson)).toBe(before)
})

test("keeps shared names independently restorable and uses CAD identity for unnamed objects", () => {
  expect(
    getHiddenCadComponents({
      circuitJson,
      hiddenCadComponentIds: new Set(["base", "lid", "unnamed"]),
    }),
  ).toEqual([
    { cad_component_id: "base", componentName: "Enclosure" },
    { cad_component_id: "lid", componentName: "Enclosure" },
    { cad_component_id: "unnamed", componentName: "unnamed" },
  ])
})

test("restoring one CAD object preserves other hidden objects and resets on circuit changes", async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
  }
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  const snapshots: ReadonlySet<string>[] = []
  const Probe = ({ circuitKey }: { circuitKey: string }) => {
    const {
      hiddenCadComponentIds,
      hideComponent,
      unhideComponent,
      unhideAllComponents,
    } = useHiddenCadComponents(circuitKey)
    snapshots.push(hiddenCadComponentIds)
    return (
      <div data-hidden={Array.from(hiddenCadComponentIds).join(",")}>
        <button onClick={() => hideComponent("base")}>Hide base</button>
        <button onClick={() => hideComponent("lid")}>Hide lid</button>
        <button onClick={() => unhideComponent("base")}>Show base</button>
        <button onClick={() => unhideComponent("unknown")}>Show unknown</button>
        <button onClick={unhideAllComponents}>Show all</button>
      </div>
    )
  }
  const root = createRoot(document.getElementById("root")!)
  const click = async (label: string) => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (element) => element.textContent === label,
    )
    expect(button).toBeDefined()
    await act(async () => button?.click())
  }
  try {
    await act(async () => root.render(<Probe circuitKey="first" />))
    await click("Hide base")
    await click("Hide lid")
    const bothHidden = snapshots.at(-1)!
    await click("Show base")
    expect(
      document.querySelector("[data-hidden]")?.getAttribute("data-hidden"),
    ).toBe("lid")
    expect(Array.from(bothHidden)).toEqual(["base", "lid"])
    await click("Show unknown")
    expect(
      document.querySelector("[data-hidden]")?.getAttribute("data-hidden"),
    ).toBe("lid")
    await click("Show all")
    expect(
      document.querySelector("[data-hidden]")?.getAttribute("data-hidden"),
    ).toBe("")
    await click("Hide base")
    await act(async () => root.render(<Probe circuitKey="second" />))
    expect(
      document.querySelector("[data-hidden]")?.getAttribute("data-hidden"),
    ).toBe("")
    await click("Show base")
    expect(
      document.querySelector("[data-hidden]")?.getAttribute("data-hidden"),
    ).toBe("")
    expect(Array.from(snapshots[0]!)).toEqual([])
  } finally {
    await act(async () => root.unmount())
    Object.assign(globalThis, {
      ...previousGlobals,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }
})
