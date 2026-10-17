import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import * as THREE from "three"
import { loadCameraFromSession, saveCameraToSession } from "../src/index"
import {
  loadCameraSession,
  saveCameraSession,
} from "../src/utils/camera-session-storage"

test("shares scoped camera sessions with the public API", () => {
  const dom = new JSDOM("", { url: "https://3d-viewer.test" })
  const previousSessionStorage = globalThis.sessionStorage
  globalThis.sessionStorage = dom.window.sessionStorage

  try {
    const cameraSessionScope = "off-origin-board"
    const publicCamera = new THREE.PerspectiveCamera()
    publicCamera.position.set(451, 233, 78)
    const publicControls = {
      target: new THREE.Vector3(417, 293, 0),
      update: () => {},
    }
    saveCameraToSession(publicCamera, {
      controls: publicControls,
      cameraSessionScope,
    })

    const viewerCamera = new THREE.PerspectiveCamera()
    const viewerControls = {
      target: new THREE.Vector3(),
      update: () => {},
    }
    expect(
      loadCameraSession({
        camera: viewerCamera,
        controls: viewerControls,
        cameraSessionScope,
      }),
    ).toBeTrue()
    expect(viewerCamera.position.toArray()).toEqual([451, 233, 78])

    viewerCamera.position.set(18, -32, 41)
    viewerControls.target.set(0, 0, 0)
    saveCameraSession({
      camera: viewerCamera,
      controls: viewerControls,
      cameraSessionScope,
    })

    expect(
      loadCameraFromSession(publicCamera, {
        controls: publicControls,
        cameraSessionScope,
      }),
    ).toBeTrue()
    expect(publicCamera.position.toArray()).toEqual([18, -32, 41])

    const legacyCamera = new THREE.PerspectiveCamera()
    legacyCamera.position.set(5, -5, 5)
    const legacyControls = {
      target: new THREE.Vector3(),
      update: () => {},
    }
    saveCameraToSession(legacyCamera, legacyControls)

    const restoredLegacyCamera = new THREE.PerspectiveCamera()
    expect(
      loadCameraFromSession(restoredLegacyCamera, legacyControls),
    ).toBeTrue()
    expect(restoredLegacyCamera.position.toArray()).toEqual([5, -5, 5])
  } finally {
    globalThis.sessionStorage = previousSessionStorage
    dom.window.close()
  }
})
