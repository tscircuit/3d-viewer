import { describe, expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import * as THREE from "three"
import { OrbitControls as ThreeOrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import {
  applyInfiniteDolly,
  getMinimumDollyDistance,
} from "../src/react-three/infinite-dolly"

const createControls = () => {
  const dom = new JSDOM("<canvas></canvas>")
  const canvas = dom.window.document.querySelector("canvas")!

  Object.defineProperties(canvas, {
    clientWidth: { value: 800 },
    clientHeight: { value: 600 },
  })
  canvas.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    }) as DOMRect

  const camera = new THREE.PerspectiveCamera(75, 4 / 3, 0.1, 1000)
  camera.position.set(0, 0, Number.EPSILON)
  camera.lookAt(0, 0, -1)

  const controls = new ThreeOrbitControls(camera, canvas as HTMLElement)
  controls.target.set(0, 0, 0)
  controls.zoomSpeed = 0.5
  controls.zoomToCursor = true
  controls.update()

  return { camera, canvas, controls, dom }
}

const dispatchWheel = ({
  canvas,
  deltaY,
  dom,
}: {
  canvas: HTMLCanvasElement
  deltaY: number
  dom: JSDOM
}) => {
  canvas.dispatchEvent(
    new dom.window.WheelEvent("wheel", {
      clientX: 400,
      clientY: 300,
      deltaY,
      cancelable: true,
    }),
  )
}

describe("OrbitControls infinite dolly", () => {
  test("keeps moving forward after reaching the orbit target", () => {
    const { camera, canvas, controls, dom } = createControls()
    const minimumDollyDistance = getMinimumDollyDistance({
      camera,
      initialOrbitDistance: 4,
    })
    const initialCameraPosition = camera.position.clone()

    const applied = applyInfiniteDolly({
      camera,
      controls,
      minimumDollyDistance,
    })
    dispatchWheel({ canvas, deltaY: -100, dom })

    expect(applied).toBe(true)
    expect(camera.position.distanceTo(initialCameraPosition)).toBeGreaterThan(
      0.001,
    )
    expect(camera.position.z).toBeLessThan(initialCameraPosition.z)
    controls.dispose()
  })

  test("zooms back out immediately from a collapsed orbit target", () => {
    const { camera, canvas, controls, dom } = createControls()
    const minimumDollyDistance = getMinimumDollyDistance({
      camera,
      initialOrbitDistance: 4,
    })
    const initialCameraPosition = camera.position.clone()

    const applied = applyInfiniteDolly({
      camera,
      controls,
      minimumDollyDistance,
    })
    dispatchWheel({ canvas, deltaY: 100, dom })

    expect(applied).toBe(true)
    expect(camera.position.distanceTo(initialCameraPosition)).toBeGreaterThan(
      0.001,
    )
    expect(camera.position.z).toBeGreaterThan(initialCameraPosition.z)
    controls.dispose()
  })

  test("leaves a healthy orbit target unchanged", () => {
    const { camera, controls } = createControls()
    controls.target.set(0, 0, -5)
    controls.update()
    const initialTarget = controls.target.clone()

    const applied = applyInfiniteDolly({
      camera,
      controls,
      minimumDollyDistance: 0.5,
    })

    expect(applied).toBe(false)
    expect(controls.target.equals(initialTarget)).toBe(true)
    controls.dispose()
  })
})
