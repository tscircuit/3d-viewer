import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act, useState } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import type { AnyCircuitElement } from "circuit-json"
import {
  AssemblyExplosionContext,
  AssemblyExplosionScene,
} from "../src/assembly-explosion/AssemblyExplosionScene"
import { AssemblyExplosionControl } from "../src/assembly-explosion/AssemblyExplosionControl"
import { extractExplosionStageMetadata } from "../src/assembly-explosion/use-assembly-explosion"
import { CameraControllerProvider } from "../src/contexts/CameraControllerContext"
import {
  ThreeContext,
  type ThreeContextState,
} from "../src/react-three/ThreeContext"

test("manual Fit waits for a mounted scene and solid geometry, then runs once", async () => {
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
  const reactRoot = createRoot(dom.window.document.getElementById("root")!)
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(4, -5, 3)
  camera.lookAt(0, 0, 0)
  const rootObject = new THREE.Group()
  const callbacks = new Set<(time: number, delta: number) => void>()
  const context: ThreeContextState = {
    scene: new THREE.Scene(),
    camera,
    rootObject,
    renderer: {} as THREE.WebGLRenderer,
    addFrameListener: (callback) => {
      callbacks.add(callback)
    },
    removeFrameListener: (callback) => {
      callbacks.delete(callback)
    },
  }
  const fitRequested = { current: false }
  const state = { assembled: [], fitRequested }
  const tick = () => {
    for (const callback of callbacks) callback(0, 0.016)
  }
  const render = (mounted: boolean) => (
    <CameraControllerProvider defaultTarget={new THREE.Vector3()}>
      <AssemblyExplosionContext.Provider value={state}>
        <AssemblyExplosionControl
          stages={["remove"]}
          amount={0}
          onChange={() => {}}
          onFit={() => {
            fitRequested.current = true
          }}
        />
        <ThreeContext.Provider value={context}>
          {mounted && <AssemblyExplosionScene />}
        </ThreeContext.Provider>
      </AssemblyExplosionContext.Provider>
    </CameraControllerProvider>
  )
  try {
    await act(async () => reactRoot.render(render(false)))
    const button = [...dom.window.document.querySelectorAll("button")].find(
      (button) => button.textContent === "Fit explosion",
    )!
    await act(async () => button.click())
    expect(fitRequested.current).toBe(true)
    await act(async () => reactRoot.render(render(true)))
    tick()
    expect(fitRequested.current).toBe(true)
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2))
    mesh.position.set(200, 30, 10)
    rootObject.add(mesh)
    tick()
    expect(fitRequested.current).toBe(false)
    const fitPosition = camera.position.clone()
    const projectedCenter = mesh.position.clone().project(camera)
    expect(Math.abs(projectedCenter.x)).toBeLessThan(1e-8)
    expect(Math.abs(projectedCenter.y)).toBeLessThan(1e-8)
    // Scrubbing or a renderer remount must not silently auto-fit again.
    mesh.position.x = 400
    tick()
    expect(camera.position.equals(fitPosition)).toBe(true)
    await act(async () => reactRoot.render(render(false)))
    await act(async () => reactRoot.render(render(true)))
    tick()
    expect(camera.position.equals(fitPosition)).toBe(true)
    fitRequested.current = true
    tick()
    expect(camera.position.x - fitPosition.x).toBeCloseTo(200)
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, previous)
    dom.window.close()
  }
})

test("opt-in Fit on stage change fits discrete stage transitions without mid-stage slider jitter and stops after manual camera interaction", async () => {
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
  const reactRoot = createRoot(dom.window.document.getElementById("root")!)
  let fitCount = 0
  let setAmountExternal!: (value: number) => void
  let triggerManualCameraInteraction!: () => void

  function Harness() {
    const [amount, setAmount] = useState(0)
    const [fitOnStageChange, setFitOnStageChange] = useState(false)
    setAmountExternal = setAmount
    triggerManualCameraInteraction = () => setFitOnStageChange(false)
    return (
      <AssemblyExplosionControl
        stages={["stage-1", "stage-2", "stage-3"]}
        amount={amount}
        onChange={setAmount}
        onFit={() => {
          fitCount++
        }}
        fitOnStageChange={fitOnStageChange}
        onFitOnStageChange={setFitOnStageChange}
      />
    )
  }

  try {
    await act(async () => reactRoot.render(<Harness />))
    const checkbox = dom.window.document.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement
    expect(checkbox.checked).toBe(false)

    // Enabling Fit on stage change immediately triggers a fit for the current stage
    await act(async () => checkbox.click())
    expect(checkbox.checked).toBe(true)
    expect(fitCount).toBe(1)

    // Entering stage 1 from 0 triggers a fit once
    await act(async () => setAmountExternal(0.2))
    expect(fitCount).toBe(2)

    // Dragging the slider smoothly within stage 1 (0.2 -> 0.5 -> 0.8) does NOT jitter the camera
    await act(async () => setAmountExternal(0.5))
    await act(async () => setAmountExternal(0.8))
    expect(fitCount).toBe(2)

    // Crossing into stage 2 (0.8 -> 1.3) triggers a fit once
    await act(async () => setAmountExternal(1.3))
    expect(fitCount).toBe(3)

    // Clicking Next from 1.3 -> 2 fits the completed stage 2 pose
    const nextButton = [...dom.window.document.querySelectorAll("button")].find(
      (b) => b.textContent === "Next",
    )!
    await act(async () => nextButton.click())
    expect(fitCount).toBe(4)

    // Manual camera interaction disables auto-fit until re-enabled
    await act(async () => triggerManualCameraInteraction())
    expect(checkbox.checked).toBe(false)
    await act(async () => nextButton.click())
    expect(fitCount).toBe(4)
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, previous)
    dom.window.close()
  }
})

test("stage displayName, plain-text instructions, and unverified contact diagnostics render cleanly while preserving stable stage identity", async () => {
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
  const reactRoot = createRoot(dom.window.document.getElementById("root")!)

  const records = [
    {
      type: "cad_explosion_stage",
      cad_explosion_stage_id: "stage_0",
      name: "flex17.squeeze_snap_axle_remove_bearing_1",
      display_name: "Squeeze snap axle & remove bearing 1",
      instructions:
        'Compress retaining ears <img src=x onerror="alert(1)"><b>before</b> sliding bearing axially.',
      order: 0,
      cad_component_ids: ["cad_1"],
      cad_reference_surface_ids: [],
    },
    {
      type: "cad_explosion_stage",
      cad_explosion_stage_id: "stage_1",
      name: "flex17.plain_stage_without_metadata",
      order: 1,
      cad_component_ids: ["cad_1"],
      cad_reference_surface_ids: [],
    },
    {
      type: "cad_explosion_collision_error",
      cad_explosion_collision_error_id: "err_0",
      error_type: "cad_explosion_collision_error",
      cad_explosion_stage_id: "stage_0",
      cad_explosion_move_id: "move_0",
      moving_cad_component_id: "cad_1",
      obstacle: { type: "cad_component", cad_component_id: "cad_0" },
      source_component_ids: ["src_1", "src_0"],
      swept_intersection_volume_mm3: 1.2108,
      verification_status: "annotated_unverified_contact",
      rationale: "Requires manual ear compression during withdrawal",
      message:
        'Explosion stage "flex17.squeeze_snap_axle_remove_bearing_1" moves "bearing1" through "chassis" (new swept intersection: 1.2108 mm³)',
    },
  ] as unknown as AnyCircuitElement[]

  const stageMetadata = extractExplosionStageMetadata(records)
  const stages = [
    "flex17.squeeze_snap_axle_remove_bearing_1",
    "flex17.plain_stage_without_metadata",
  ]

  try {
    // At amount = 1, stage 0 uses displayName, renders instructions as literal text, and shows unverified contact status
    await act(async () =>
      reactRoot.render(
        <AssemblyExplosionControl
          stages={stages}
          stageMetadata={stageMetadata}
          amount={1}
          onChange={() => {}}
        />,
      ),
    )
    const slider = dom.window.document.querySelector(
      'input[type="range"]',
    ) as HTMLInputElement
    expect(slider.getAttribute("aria-valuetext")).toBe(
      "Squeeze snap axle & remove bearing 1",
    )
    const instructionsNode = dom.window.document.querySelector(
      '[data-testid="explosion-stage-instructions"]',
    )!
    expect(instructionsNode.textContent).toBe(
      'Compress retaining ears <img src=x onerror="alert(1)"><b>before</b> sliding bearing axially.',
    )
    // Instructions must be rendered as text, never parsed as HTML elements
    expect(instructionsNode.querySelectorAll("*").length).toBe(0)

    const diagnosticsNode = dom.window.document.querySelector(
      '[data-testid="explosion-contact-diagnostics"]',
    )!
    expect(diagnosticsNode.textContent).toContain(
      "Unverified deformation contact (not physically validated)",
    )
    expect(diagnosticsNode.textContent).toContain(
      "Requires manual ear compression during withdrawal",
    )
    // Must not trigger a blocking role="alert"
    expect(dom.window.document.querySelector('[role="alert"]')).toBeNull()

    // At amount = 2, stage 1 has no displayName/instructions/diagnostics -> falls back to stage.name and omits placeholders
    await act(async () =>
      reactRoot.render(
        <AssemblyExplosionControl
          stages={stages}
          stageMetadata={stageMetadata}
          amount={2}
          onChange={() => {}}
        />,
      ),
    )
    expect(slider.getAttribute("aria-valuetext")).toBe(
      "flex17.plain_stage_without_metadata",
    )
    expect(
      dom.window.document.querySelector(
        '[data-testid="explosion-stage-instructions"]',
      ),
    ).toBeNull()
    expect(
      dom.window.document.querySelector(
        '[data-testid="explosion-contact-diagnostics"]',
      ),
    ).toBeNull()
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, previous)
    dom.window.close()
  }
})
