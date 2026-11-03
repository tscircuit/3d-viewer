import { afterEach, beforeEach, expect, spyOn, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act, useEffect } from "react"
import { createRoot, type Root } from "react-dom/client"
import * as THREE from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { useExportGltfUrl, useSaveGltfAs } from "../src/hooks/exporter/gltf"
import { useGlobalDownloadGltf } from "../src/hooks/useGlobalDownloadGltf"
import { findModelObject } from "../src/utils/clone-model-for-export"

const GLB_MAGIC = 0x46546c67
const GLB_TOTAL_LENGTH_OFFSET = 8

const replacedGlobals = [
  "window",
  "document",
  "Blob",
  "FileReader",
  "MouseEvent",
  "IS_REACT_ACT_ENVIRONMENT",
]

let dom: JSDOM
let reactRoot: Root
let holder: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
let previousGlobals: PropertyDescriptorMap
let exportedBlob: Promise<Blob>
let clickedDownload: HTMLAnchorElement | undefined
let createUrlSpy: ReturnType<typeof spyOn<typeof URL, "createObjectURL">>
let revokeUrlSpy: ReturnType<typeof spyOn<typeof URL, "revokeObjectURL">>
let clickSpy: ReturnType<typeof spyOn<HTMLAnchorElement, "click">>
let dispatchSpy: ReturnType<typeof spyOn<HTMLAnchorElement, "dispatchEvent">>

beforeEach(async () => {
  previousGlobals = {}
  for (const name of replacedGlobals) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name)
    if (descriptor) previousGlobals[name] = descriptor
  }
  dom = new JSDOM('<div id="root"></div>', {
    url: "https://3d-viewer.test",
  })
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Blob: dom.window.Blob,
    FileReader: dom.window.FileReader,
    MouseEvent: dom.window.MouseEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  // JSDOM omits Blob.arrayBuffer(), which browsers provide to the old exporter.
  dom.window.Blob.prototype.arrayBuffer = function () {
    return readExportedArrayBuffer(this)
  }
  const capture = Promise.withResolvers<Blob>()
  exportedBlob = capture.promise
  createUrlSpy = spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    if (!(blob instanceof Blob)) throw new Error("Expected an exported Blob")
    capture.resolve(blob)
    return "blob:https://3d-viewer.test/holder"
  })
  revokeUrlSpy = spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
  clickedDownload = undefined
  clickSpy = spyOn(
    dom.window.HTMLAnchorElement.prototype,
    "click",
  ).mockImplementation(function (this: HTMLAnchorElement) {
    clickedDownload = this
  })
  dispatchSpy = spyOn(
    dom.window.HTMLAnchorElement.prototype,
    "dispatchEvent",
  ).mockImplementation(function (this: HTMLAnchorElement) {
    clickedDownload = this
    return true
  })
  reactRoot = createRoot(document.getElementById("root")!)
  const holderBytes = await Bun.file(
    new URL("../stories/assets/gimbal-phone-holder.stl", import.meta.url),
  ).arrayBuffer()
  holder = new THREE.Mesh(
    new STLLoader().parse(holderBytes),
    new THREE.MeshStandardMaterial(),
  )
  holder.geometry.computeBoundingBox()
})

afterEach(async () => {
  await act(async () => reactRoot.unmount())
  createUrlSpy.mockRestore()
  revokeUrlSpy.mockRestore()
  clickSpy.mockRestore()
  dispatchSpy.mockRestore()
  holder.geometry.dispose()
  holder.material.dispose()
  dom.window.close()
  for (const name of replacedGlobals) {
    const descriptor = previousGlobals[name]
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor)
    } else {
      Reflect.deleteProperty(globalThis, name)
    }
  }
})

function readExportedText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

function readExportedArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result)
      else reject(new Error("Expected binary output"))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

const DownloadHolder = () => {
  const download = useGlobalDownloadGltf()
  useEffect(() => download(), [download])
  return null
}

const DownloadHolderComponent = () => {
  const download = useGlobalDownloadGltf()
  useEffect(() => download({ objectId: "holder_cad", name: "U1" }), [download])
  return null
}

const ExportHolder = () => {
  const [ref, url] = useExportGltfUrl()
  useEffect(() => {
    if (typeof ref === "function") ref(holder)
  }, [ref])
  return <output>{url}</output>
}

const SaveHolder = () => {
  const [ref, saveAs] = useSaveGltfAs()
  useEffect(() => {
    if (typeof ref === "function") ref(holder)
    void saveAs("holder.gltf")
  }, [])
  return null
}

const SaveBinaryHolder = () => {
  const [ref, saveAs] = useSaveGltfAs()
  useEffect(() => {
    if (typeof ref === "function") ref(holder)
    void saveAs("holder.glb")
  }, [])
  return null
}

test("Download GLTF exports the full gimbal holder without overflowing the call stack", async () => {
  window.__TSCIRCUIT_THREE_OBJECT = holder
  await act(async () => {
    reactRoot.render(<DownloadHolder />)
  })
  await act(async () => {
    await exportedBlob
  })

  const gltf = JSON.parse(await readExportedText(await exportedBlob))
  const positions =
    gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION]
  expect(clickedDownload?.download).toBe("scene.gltf")
  expect(positions.count).toBe(30420)
  expect(positions.min).toEqual(holder.geometry.boundingBox!.min.toArray())
  expect(positions.max).toEqual(holder.geometry.boundingBox!.max.toArray())
  expect(gltf.buffers[0].uri).toStartWith(
    "data:application/octet-stream;base64,",
  )
})

test("Download GLTF on a right-clicked model exports only that model in place", async () => {
  const root = new THREE.Object3D()
  root.position.z = 1
  const component = new THREE.Group()
  component.userData.cad_component_id = "holder_cad"
  component.position.set(10, -5, 0)
  component.add(holder)
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 1.6),
    new THREE.MeshStandardMaterial(),
  )
  root.add(board, component)
  window.__TSCIRCUIT_THREE_OBJECT = root
  await act(async () => {
    reactRoot.render(<DownloadHolderComponent />)
  })
  await act(async () => {
    await exportedBlob
  })

  const gltf = JSON.parse(await readExportedText(await exportedBlob))
  expect(clickedDownload?.download).toBe("U1.gltf")
  expect(gltf.meshes).toHaveLength(1)
  expect(
    gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION].count,
  ).toBe(30420)
  const top = gltf.nodes[gltf.scenes[0].nodes[0]]
  expect(top.name).toBe("U1")
  expect(top.extras.cad_component_id).toBe("holder_cad")
  expect(top.matrix.slice(12, 15)).toEqual([10, -5, 1])
  // The scene graph is untouched by the export.
  expect(holder.parent).toBe(component)
  expect(component.name).toBe("")
  board.geometry.dispose()
  board.material.dispose()
})

test("only CAD components and cables count as downloadable models", () => {
  const root = new THREE.Object3D()
  const board = new THREE.Group()
  board.userData.pcb_board_id = "board1"
  const component = new THREE.Group()
  component.userData.cad_component_id = "u1_cad"
  const nested = new THREE.Group()
  nested.userData.cad_component_id = "u1_cad"
  component.add(nested)
  const cable = new THREE.Group()
  cable.userData = { cad_cable_id: "cable1", name: "W1" }
  root.add(board, component, cable)
  expect(findModelObject(root, "u1_cad")).toBe(component)
  expect(findModelObject(root, "cable1")).toBe(cable)
  expect(findModelObject(root, "board1")).toBeUndefined()
})

test("useExportGltfUrl exports the full gimbal holder as JSON", async () => {
  await act(async () => {
    reactRoot.render(<ExportHolder />)
  })
  await act(async () => {
    await exportedBlob
  })

  const gltf = JSON.parse(await readExportedText(await exportedBlob))
  const positions =
    gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION]
  expect(positions.count).toBe(30420)
  expect(document.querySelector("output")?.textContent).toBe(
    "blob:https://3d-viewer.test/holder",
  )
})

test("useSaveGltfAs downloads the full gimbal holder as JSON", async () => {
  await act(async () => {
    reactRoot.render(<SaveHolder />)
  })
  await act(async () => {
    await exportedBlob
  })

  const gltf = JSON.parse(await readExportedText(await exportedBlob))
  const positions =
    gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION]
  expect(clickedDownload?.download).toBe("holder.gltf")
  expect(positions.count).toBe(30420)
})

test("useSaveGltfAs still downloads a binary GLB", async () => {
  await act(async () => {
    reactRoot.render(<SaveBinaryHolder />)
  })
  await act(async () => {
    await exportedBlob
  })

  const blob = await exportedBlob
  const header = await readExportedArrayBuffer(blob)
  expect(clickedDownload?.download).toBe("holder.glb")
  expect(blob.type).toBe("model/gltf-binary")
  expect(new DataView(header).getUint32(0, true)).toBe(GLB_MAGIC)
  expect(new DataView(header).getUint32(GLB_TOTAL_LENGTH_OFFSET, true)).toBe(
    blob.size,
  )
})
