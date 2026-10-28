import { expect, test } from "bun:test"
import {
  Circuit,
  assembly,
  getAssemblyExplosion,
  getCircuitJsonAssemblyExplosion,
  type RootCircuit,
} from "@tscircuit/core"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { explosionAssembly } from "../stories/fixtures/explosion-assembly"
import { useAssemblyExplosion } from "../src/assembly-explosion/use-assembly-explosion"
import {
  applyAssemblyOffsets,
  getAssemblyOffsets,
} from "../src/assembly-explosion/AssemblyExplosionScene"
import { AssemblyExplosionControl } from "../src/assembly-explosion/AssemblyExplosionControl"

async function createCircuit() {
  const circuit = new Circuit()
  circuit.add(explosionAssembly)
  await circuit.renderUntilSettled()
  return circuit
}

test("TSX stages move parent/child and multiple targets, preserve assembled data, and reset scene groups", async () => {
  const circuit = await createCircuit()
  const assembled = circuit.getCircuitJson()
  const original = structuredClone(assembled)
  const root = new THREE.Group()
  const bases = new Map<THREE.Object3D, THREE.Vector3>()
  for (const element of assembled) {
    if (element.type !== "cad_component") continue
    const group = new THREE.Group()
    group.userData.cad_component_id = element.cad_component_id
    group.position.set(1, 2, 3)
    root.add(group)
  }
  const evaluate = (stage: string, progress: number) =>
    getAssemblyExplosion(circuit, {
      throughStageRef: stage,
      stageProgress: progress,
    })
  const half = getAssemblyOffsets(assembled, evaluate("case.lift", 0.5))
  expect([...half.values()].filter((p) => p.z === 7.5)).toHaveLength(2)
  const full = getAssemblyOffsets(assembled, evaluate("case.remove-cap", 1))
  expect([...full.values()].map((p) => p.toArray())).toEqual(
    expect.arrayContaining([
      [0, 0, 0],
      [20, 0, 15],
      [20, 0, 25],
    ]),
  )
  applyAssemblyOffsets(root, full, bases)
  applyAssemblyOffsets(root, full, bases)
  expect(root.children.map((p) => p.position.toArray())).toEqual(
    expect.arrayContaining([
      [1, 2, 3],
      [21, 2, 18],
      [21, 2, 28],
    ]),
  )
  // Late-loaded models receive the current view without a polling timeout.
  const late = root.children.at(-1)!
  root.remove(late)
  const replacement = new THREE.Group()
  replacement.userData = { ...late.userData }
  root.add(replacement)
  applyAssemblyOffsets(root, half, bases)
  expect(replacement.position.z).toBe(7.5)
  applyAssemblyOffsets(root, new Map(), bases)
  expect(replacement.position.toArray()).toEqual([0, 0, 0])
  expect(circuit.getCircuitJson()).toEqual(original)
})

test("viewer scrubs stages, resets on input changes, plays serialized JSON programs, and reports invalid targets", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" })
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
  const root = createRoot(dom.window.document.getElementById("root")!)
  let state!: ReturnType<typeof useAssemblyExplosion>
  function Harness({
    circuit,
    children,
    circuitJson,
  }: {
    circuit?: RootCircuit
    circuitJson?: ReturnType<RootCircuit["getCircuitJson"]>
    children?: React.ReactNode
  }) {
    state = useAssemblyExplosion(children, circuit, circuitJson)
    return (
      <AssemblyExplosionControl
        stages={state.stages}
        amount={state.amount}
        onChange={state.setAmount}
        error={state.error}
      />
    )
  }
  try {
    const circuit = await createCircuit()
    await act(async () => root.render(<Harness circuit={circuit} />))
    expect(state.stages).toEqual(["case.lift", "case.slide", "case.remove-cap"])
    await act(async () => state.setAmount(1.5))
    expect(state.view).toEqual(
      getCircuitJsonAssemblyExplosion(circuit.getCircuitJson(), {
        throughStageRef: "case.slide",
        stageProgress: 0.5,
      }),
    )
    await act(async () => state.setAmount(0.5))
    expect(state.view).toEqual(
      getCircuitJsonAssemblyExplosion(circuit.getCircuitJson(), {
        throughStageRef: "case.lift",
        stageProgress: 0.5,
      }),
    )
    await act(async () => dom.window.document.querySelector("button")!.click())
    expect(state.amount).toBe(0)
    expect(state.view).toBeUndefined()
    await act(async () => state.setAmount(3))
    await act(async () =>
      root.render(<Harness circuit={await createCircuit()} />),
    )
    expect(state.amount).toBe(0)
    const json = JSON.parse(JSON.stringify(circuit.getCircuitJson()))
    await act(async () => root.render(<Harness circuitJson={json} />))
    expect(state.stages).toHaveLength(3)
    await act(async () => state.setAmount(1.5))
    expect(state.view).toEqual(
      getCircuitJsonAssemblyExplosion(json, {
        throughStageRef: "case.slide",
        stageProgress: 0.5,
      }),
    )
    await act(async () =>
      root.render(
        <Harness
          circuitJson={json.filter(
            (record: any) => !record.type.startsWith("cad_explosion_"),
          )}
        />,
      ),
    )
    expect(state.stages).toHaveLength(0)
    await act(async () => root.render(<Harness />))
    expect(dom.window.document.querySelector('input[type="range"]')).toBeNull()
    await act(async () => root.render(<Harness>{explosionAssembly}</Harness>))
    // Await the asynchronous TSX render, including any pending effects.
    for (let i = 0; i < 50 && !state.stages.length; i++)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
    expect(state.stages).toHaveLength(3)
    const invalid = new Circuit()
    invalid.add(
      <assembly.device name="bad">
        <assembly.explosion.stage name="lift">
          <assembly.explosion.move targetRef="missing" offZ={1} />
        </assembly.explosion.stage>
      </assembly.device>,
    )
    await invalid.renderUntilSettled()
    await act(async () => root.render(<Harness circuit={invalid} />))
    expect(
      dom.window.document.querySelector('[role="alert"]')?.textContent,
    ).toContain('target "missing"')
    expect(state.view).toBeUndefined()
  } finally {
    await act(async () => root.unmount())
    Object.assign(globalThis, previous)
    dom.window.close()
  }
})
