import { createSectionExport } from "../sections/section-export"
import { useCallback } from "react"
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js"
import type * as THREE from "three"
import type { PickedSceneObject } from "../utils/pick-scene-object"
import { cloneModelForExport } from "../utils/clone-model-for-export"

declare global {
  interface Window {
    __TSCIRCUIT_THREE_OBJECT?: THREE.Object3D
  }
}

/** Download the whole scene, or only `model` when one is given. */
export const useGlobalDownloadGltf = () => {
  return useCallback(
    (model?: PickedSceneObject, root = window.__TSCIRCUIT_THREE_OBJECT) => {
      if (!root) return
      const target = model ? cloneModelForExport(root, model.objectId) : root
      if (!target) return
      if (model) target.name = model.name
      const section = root.userData.sectionView
      const sectionExport = section
        ? createSectionExport(target, section)
        : undefined
      const exporter = new GLTFExporter()
      exporter.parse(
        sectionExport?.root ?? target,
        (gltf) => {
          sectionExport?.dispose()
          const blob = new Blob(
            [gltf instanceof ArrayBuffer ? gltf : JSON.stringify(gltf)],
            { type: "model/gltf+json" },
          )
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = model ? `${model.name}.gltf` : "scene.gltf"
          link.click()
          URL.revokeObjectURL(url)
        },
        (err) => {
          sectionExport?.dispose()
          console.error("Failed to export GLTF", err)
        },
      )
    },
    [],
  )
}
