import { useEffect } from "react"
import * as THREE from "three"
import { useAppearance } from "../contexts/appearance-context"
import { useThree } from "./ThreeContext"

export const Wireframe = () => {
  const { wireframeEnabled } = useAppearance()
  const { rootObject, addFrameListener, removeFrameListener } = useThree()

  useEffect(() => {
    if (!wireframeEnabled) return

    const originals = new Map<
      THREE.Material & { wireframe: boolean },
      boolean
    >()
    const applyWireframe = () => {
      // Loaders and engine switches can add or replace meshes after the toggle.
      // Restrict this to the circuit root so the grid and other scene helpers
      // retain their own appearance.
      rootObject.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material]

        for (const material of materials) {
          if (!("wireframe" in material)) continue
          if (typeof material.wireframe !== "boolean") continue
          if (!originals.has(material)) {
            originals.set(material, material.wireframe)
          }
          material.wireframe = true
        }
      })
    }

    applyWireframe()
    addFrameListener(applyWireframe)
    return () => {
      removeFrameListener(applyWireframe)
      for (const [material, wireframe] of originals) {
        material.wireframe = wireframe
      }
    }
  }, [wireframeEnabled, rootObject, addFrameListener, removeFrameListener])

  return null
}
