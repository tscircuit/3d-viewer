import { afterEach, beforeEach, expect, spyOn, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act, useEffect } from "react"
import { createRoot, type Root } from "react-dom/client"
import * as THREE from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { useExportGltfUrl, useSaveGltfAs } from "../src/hooks/exporter/gltf"
import { useGlobalDownloadGltf } from "../src/hooks/useGlobalDownloadGltf"

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
