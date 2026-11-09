import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { fitExplosionCamera } from "../src/assembly-explosion/fit-explosion-camera"

test.each(["perspective", "orthographic"] as const)(
  "explicit %s fit clears pending orbit/pan damping without changing view direction",
  (kind) => {
    const dom = new JSDOM('<div id="controls"></div>')
    const element = dom.window.document.getElementById("controls")!
    Object.defineProperties(element, {
      clientWidth: { value: 300 },
      clientHeight: { value: 300 },
    })
    Object.assign(element, {
      setPointerCapture: () => {},
      releasePointerCapture: () => {},
    })
    const camera =
      kind === "perspective"
        ? new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
        : new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000)
    camera.position.set(20, -30, 15)
    camera.up.set(0, 0, 1)
    const controls = new OrbitControls(camera, element)
    controls.target.set(2, 4, 3)
    controls.update()
    controls.enableDamping = true
    controls.dampingFactor = 0.1
    controls.autoRotate = false
    controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN
    const pointer = (type: string, button: number, x: number, y: number) => {
      const event = new dom.window.Event(type, {
        bubbles: true,
        cancelable: true,
      })
      Object.assign(event, {
        pointerId: 1,
        pointerType: "mouse",
        button,
        clientX: x,
        clientY: y,
        pageX: x,
        pageY: y,
      })
      element.dispatchEvent(event)
    }
    try {
      pointer("pointerdown", 1, 100, 100)
      pointer("pointermove", 1, 130, 100)
      pointer("pointerup", 1, 130, 100)
      pointer("pointerdown", 0, 100, 100)
      pointer("pointermove", 0, 110, 105)
      pointer("pointerup", 0, 110, 105)
      const direction = camera.getWorldDirection(new THREE.Vector3())
      const bounds = new THREE.Box3(
        new THREE.Vector3(-130, -5, 10),
        new THREE.Vector3(230, 80, 65),
      )
      const center = bounds.getCenter(new THREE.Vector3())
      fitExplosionCamera(camera, bounds, controls)
      expect(controls.target.distanceTo(center)).toBeLessThan(1e-9)
      expect(
        camera.getWorldDirection(new THREE.Vector3()).distanceTo(direction),
      ).toBeLessThan(1e-9)
      expect(controls.enableDamping).toBe(true)
      expect(controls.autoRotate).toBe(false)
      const fittedPosition = camera.position.clone()
      const fittedZoom = camera.zoom
      for (let i = 0; i < 30; i++) controls.update()
      expect(controls.target.distanceTo(center)).toBeLessThan(1e-9)
      expect(camera.position.distanceTo(fittedPosition)).toBeLessThan(1e-9)
      expect(
        camera.getWorldDirection(new THREE.Vector3()).distanceTo(direction),
      ).toBeLessThan(1e-9)
      fitExplosionCamera(camera, bounds, controls)
      expect(camera.position.distanceTo(fittedPosition)).toBeLessThan(1e-9)
      expect(camera.zoom).toBeCloseTo(fittedZoom, 10)
    } finally {
      controls.dispose()
      dom.window.close()
    }
  },
)
