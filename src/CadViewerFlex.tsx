import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useMemo, useState, type ComponentProps } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three-stdlib"
import { CadViewerContainer } from "./CadViewerContainer"
import { useLayerVisibility } from "./contexts/LayerVisibilityContext"
import { getCadPcbContext } from "./utils/get-cad-pcb-context"
import { useThree } from "./react-three/ThreeContext"
import { FitCameraToComparison } from "./three-components/reference-object"
import { configureObjectShadows } from "./utils/configure-object-shadows"

function disposeScene(scene: THREE.Object3D) {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    for (const material of [object.material].flat()) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose()
      }
      material.dispose()
    }
  })
}

function FlexScene({
  scene,
  circuitJson,
}: {
  scene: THREE.Group
  circuitJson: AnyCircuitElement[]
}) {
  const { visibility } = useLayerVisibility()
  useEffect(() => {
    for (const node of scene.children[0]?.children ?? []) {
      const cad = circuitJson.find(
        (element) =>
          element.type === "cad_component" &&
          circuitJson.some(
            (source) =>
              source.type === "source_component" &&
              source.source_component_id === element.source_component_id &&
              source.name === node.name,
          ),
      )
      if (cad?.type === "cad_component") {
        const { isThroughHole } = getCadPcbContext(cad, circuitJson)
        node.visible = isThroughHole
          ? visibility.throughHoleModels
          : visibility.smtModels
      } else {
        node.visible = visibility.boardBody
      }
    }
  }, [
    scene,
    circuitJson,
    visibility.boardBody,
    visibility.smtModels,
    visibility.throughHoleModels,
  ])
  const { rootObject } = useThree()
  useEffect(() => {
    rootObject.add(scene)
    return () => {
      rootObject.remove(scene)
    }
  }, [rootObject, scene])
  const bounds = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    return {
      minX: box.min.x,
      maxX: box.max.x,
      minY: box.min.y,
      maxY: box.max.y,
      minZ: box.min.z,
      maxZ: box.max.z,
    }
  }, [scene])
  return <FitCameraToComparison bounds={bounds} />
}

type Props = ComponentProps<typeof CadViewerContainer> & {
  circuitJson: AnyCircuitElement[]
  foldPcbs: boolean
  resolveStaticAsset?: (url: string) => string
}

/** Flex geometry is exported in glTF's +Y-up frame and converted back to the
 * viewer's right-handed PCB frame (+X right, +Y top, +Z above), in mm.
 * The input Circuit JSON and its flat PCB/CAD coordinates are never mutated.
 */
export function CadViewerFlex({
  circuitJson,
  foldPcbs,
  resolveStaticAsset,
  ...props
}: Props) {
  const [result, setResult] = useState<{ scene?: THREE.Group; error?: string }>(
    {},
  )
  useEffect(() => {
    let active = true
    let scene: THREE.Group | undefined
    setResult({})
    async function load() {
      const { convertCircuitJsonToGltf } = await import("circuit-json-to-gltf")
      const input = resolveStaticAsset
        ? circuitJson.map((element) => {
            if (element.type !== "cad_component") return element
            const model = { ...element }
            for (const key of [
              "model_obj_url",
              "model_stl_url",
              "model_gltf_url",
              "model_glb_url",
              "model_step_url",
            ] as const) {
              if (model[key]) model[key] = resolveStaticAsset(model[key])
            }
            return model
          })
        : circuitJson
      const glb = await convertCircuitJsonToGltf(input, {
        format: "glb",
        foldPcbs,
      })
      if (!active) return
      if (!(glb instanceof ArrayBuffer)) throw new Error("Expected binary glTF")
      const loaded = await new GLTFLoader().parseAsync(glb, "")
      scene = new THREE.Group()
      scene.name = "flex-pcb-scene"
      scene.userData.foldPcbs = foldPcbs
      // Same proper rotation as RendererComparison's exportToProject: G -> P.
      // Points map (x,y,z) -> (-x,z,y); determinant +1 preserves handedness.
      scene.matrixAutoUpdate = false
      scene.matrix.set(-1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1)
      scene.add(loaded.scene)
      configureObjectShadows(scene)
      if (!active) {
        disposeScene(scene)
        return
      }
      setResult({ scene })
    }
    load().catch((error: unknown) => {
      if (active)
        setResult({
          error: error instanceof Error ? error.message : String(error),
        })
    })
    return () => {
      active = false
      if (scene) disposeScene(scene)
    }
  }, [circuitJson, foldPcbs, resolveStaticAsset])

  const layout = useMemo(() => {
    if (!result.scene) return undefined
    const bounds = new THREE.Box3().setFromObject(result.scene)
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    return {
      boardDimensions: { width: size.x, height: size.y },
      boardCenter: { x: center.x, y: center.y },
    }
  }, [result.scene])
  if (result.error)
    return (
      <div role="alert" style={{ padding: 16 }}>
        Unable to render PCB: {result.error}
      </div>
    )
  if (!result.scene)
    return (
      <div role="status" style={{ padding: 16 }}>
        Rendering PCB…
      </div>
    )
  return (
    <CadViewerContainer {...props} {...layout}>
      <FlexScene scene={result.scene} circuitJson={circuitJson} />
    </CadViewerContainer>
  )
}
