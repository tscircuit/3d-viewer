import { expect, spyOn, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act, useEffect } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { useGlobalDownloadGltf } from "../src/hooks/useGlobalDownloadGltf"

const replacedGlobals = [
  "window",
  "document",
  "Blob",
  "FileReader",
  "IS_REACT_ACT_ENVIRONMENT",
]

const readExportedText = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })

const DownloadModel = () => {
  const download = useGlobalDownloadGltf()
  useEffect(() => download({ objectId: "u1_cad", name: "U1" }), [download])
  return null
}

test("Download GLTF on a right-clicked model exports only that model in place", async () => {
  const previousGlobals: PropertyDescriptorMap = {}
  for (const name of replacedGlobals) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name)
    if (descriptor) previousGlobals[name] = descriptor
  }
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://3d-viewer.test",
  })
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Blob: dom.window.Blob,
    FileReader: dom.window.FileReader,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  const capture = Promise.withResolvers<Blob>()
  const createUrlSpy = spyOn(URL, "createObjectURL").mockImplementation(
    (blob) => {
      if (!(blob instanceof Blob)) throw new Error("Expected an exported Blob")
      capture.resolve(blob)
      return "blob:https://3d-viewer.test/model"
    },
  )
  const revokeUrlSpy = spyOn(URL, "revokeObjectURL").mockImplementation(
    () => {},
  )
  let clickedDownload: HTMLAnchorElement | undefined
  const clickSpy = spyOn(
    dom.window.HTMLAnchorElement.prototype,
    "click",
  ).mockImplementation(function (this: HTMLAnchorElement) {
    clickedDownload = this
  })
  const reactRoot = createRoot(document.getElementById("root")!)

  const root = new THREE.Object3D()
  root.position.z = 1
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 1.6),
    new THREE.MeshStandardMaterial(),
  )
  board.userData.pcb_board_id = "board1"
  const component = new THREE.Group()
  component.userData.cad_component_id = "u1_cad"
  component.position.set(10, -5, 0)
  const model = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial(),
  )
  component.add(model)
  root.add(board, component)
  window.__TSCIRCUIT_THREE_OBJECT = root

  try {
    await act(async () => {
      reactRoot.render(<DownloadModel />)
    })
    const gltf = JSON.parse(await readExportedText(await capture.promise))
    expect(clickedDownload?.download).toBe("U1.gltf")
    expect(gltf.meshes).toHaveLength(1)
    expect(
      gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION].count,
    ).toBe(model.geometry.getAttribute("position").count)
    const top = gltf.nodes[gltf.scenes[0].nodes[0]]
    expect(top.name).toBe("U1")
    expect(top.extras.cad_component_id).toBe("u1_cad")
    expect(top.matrix.slice(12, 15)).toEqual([10, -5, 1])
    // The scene graph is untouched by the export.
    expect(model.parent).toBe(component)
    expect(component.parent).toBe(root)
    expect(component.name).toBe("")
  } finally {
    await act(async () => reactRoot.unmount())
    createUrlSpy.mockRestore()
    revokeUrlSpy.mockRestore()
    clickSpy.mockRestore()
    for (const mesh of [board, model]) {
      mesh.geometry.dispose()
      mesh.material.dispose()
    }
    dom.window.close()
    for (const name of replacedGlobals) {
      const descriptor = previousGlobals[name]
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else Reflect.deleteProperty(globalThis, name)
    }
  }
})
