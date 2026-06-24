import { useCallback } from "react"
import { GLTFExporter } from "three-stdlib"
import type * as THREE from "three"

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
    exporter.parse(
      root,
      (gltf) => {
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
        console.error("Failed to export GLTF", err)
      },
    )
  }, [])
}
