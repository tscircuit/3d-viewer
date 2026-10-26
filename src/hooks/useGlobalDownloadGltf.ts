import { createSectionExport } from "../sections/section-export"
import { useCallback } from "react"
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js"
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
    const section = root.userData.sectionView
    const sectionExport = section
      ? createSectionExport(root, section)
      : undefined
    const exporter = new GLTFExporter()
    exporter.parse(
      sectionExport?.root ?? root,
      (gltf) => {
        sectionExport?.dispose()
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
        sectionExport?.dispose()
        console.error("Failed to export GLTF", err)
      },
    )
  }, [])
}
