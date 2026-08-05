import { useCallback } from "react"
import { GLTFExporter } from "three-stdlib"
import type * as THREE from "three"
import { hidePreviewOnlyObjects } from "../utils/hide-preview-only-objects"

declare global {
  interface Window {
    __TSCIRCUIT_THREE_OBJECT?: THREE.Object3D
  }
}

export const useGlobalDownloadGltf = () => {
  return useCallback(() => {
    const root = window.__TSCIRCUIT_THREE_OBJECT
    if (!root) return
    const exporter = new GLTFExporter()
    const restorePreviewObjects = hidePreviewOnlyObjects(root)
    try {
      exporter.parse(
        root,
        (gltf) => {
          restorePreviewObjects()
          const blob = new Blob(
            [gltf instanceof ArrayBuffer ? gltf : JSON.stringify(gltf)],
            { type: "model/gltf+json" },
          )
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = "scene.gltf"
          link.click()
          URL.revokeObjectURL(url)
        },
        (err) => {
          restorePreviewObjects()
          console.error("Failed to export GLTF", err)
        },
        { onlyVisible: true },
      )
    } catch (error) {
      restorePreviewObjects()
      console.error("Failed to export GLTF", error)
    }
  }, [])
}
