import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import * as THREE from "three"
import {
  loadCameraSession,
  saveCameraSession,
} from "../src/utils/camera-session-storage"

test("keeps persisted camera positions scoped to their board", () => {
  const dom = new JSDOM("", { url: "https://3d-viewer.test" })
  const previousSessionStorage = globalThis.sessionStorage
  globalThis.sessionStorage = dom.window.sessionStorage

  try {
    const offOriginCamera = new THREE.PerspectiveCamera()
    offOriginCamera.position.set(451, 233, 78)
    const offOriginControls = {
      target: new THREE.Vector3(417, 293, 0),
      update: () => {},
    }
    saveCameraSession({
      camera: offOriginCamera,
      controls: offOriginControls,
      cameraSessionScope: "off-origin-board",
    })

    const centeredCamera = new THREE.PerspectiveCamera()
    centeredCamera.position.set(18, -32, 41)
    const centeredControls = {
      target: new THREE.Vector3(),
      update: () => {},
    }
    const restoredDifferentBoard = loadCameraSession({
      camera: centeredCamera,
      controls: centeredControls,
      cameraSessionScope: "centered-board",
    })

    expect(restoredDifferentBoard).toBeFalse()
    expect(centeredCamera.position.toArray()).toEqual([18, -32, 41])

    const restoredSameBoard = loadCameraSession({
      camera: centeredCamera,
      controls: centeredControls,
      cameraSessionScope: "off-origin-board",
    })
    expect(restoredSameBoard).toBeTrue()
    expect(centeredCamera.position.toArray()).toEqual([451, 233, 78])
    expect(centeredControls.target.toArray()).toEqual([417, 293, 0])
  } finally {
    globalThis.sessionStorage = previousSessionStorage
  }
})
