import { useEffect, useMemo, useState } from "react"
import { useGlbModel } from "./hooks/useGlbModel"
import * as THREE from "three"
import { CadViewerContainer } from "./CadViewerContainer"
import type { CameraController } from "./hooks/cameraAnimation"
import type { ReferenceObjectType } from "./reference-objects/reference-object"
import { useThree } from "./react-three/ThreeContext"
import { useHover } from "./react-three/HoverContext"
import { Html } from "./react-three/Html"
import { FitCameraToComparison } from "./three-components/reference-object"
import { getGlbComponentMetadata } from "./utils/prerendered-glb"

export function GlbScene({
  model,
  hiddenCadComponentIds,
}: {
  model: THREE.Group
  hiddenCadComponentIds?: ReadonlySet<string>
}) {
  const { rootObject } = useThree()
  const { addHoverable, removeHoverable } = useHover()
  const [hover, setHover] = useState<{
    name: string
    position: [number, number, number]
  }>()
  const bounds = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model)
    if (box.isEmpty()) return
    return {
      minX: box.min.x,
      maxX: box.max.x,
      minY: box.min.y,
      maxY: box.max.y,
      minZ: box.min.z,
      maxZ: box.max.z,
    }
  }, [model])
  useEffect(() => {
    rootObject.add(model)
    return () => {
      rootObject.remove(model)
    }
  }, [rootObject, model])
  useEffect(() => {
    setHover(undefined)
    model.traverse((object) => {
      const id = object.userData.cad_component_id
      if (typeof id === "string")
        object.visible = !hiddenCadComponentIds?.has(id)
    })
  }, [model, hiddenCadComponentIds])
  useEffect(() => {
    const meshes: THREE.Mesh[] = []
    model.traverse((mesh) => {
      if (!(mesh instanceof THREE.Mesh)) return
      // Raycaster includes invisible objects. Do not let a hidden enclosure
      // intercept hover events for the components underneath it.
      let ancestor: THREE.Object3D | null = mesh
      while (ancestor) {
        if (!ancestor.visible) return
        ancestor = ancestor.parent
      }
      meshes.push(mesh)
      addHoverable({
        object: mesh,
        onHover: ({ mousePosition }) => {
          let object: THREE.Object3D | null = mesh
          let name: string | undefined
          let nodeName: string | undefined
          let visible = true
          while (object) {
            name ??= getGlbComponentMetadata(object)?.componentName
            // GLTFLoader preserves the original label before sanitizing object.name.
            if (!nodeName && typeof object.userData.name === "string") {
              nodeName = object.userData.name
            }
            visible &&= object.visible
            object = object.parent
          }
          name ??= nodeName
          setHover(
            name && visible ? { name, position: mousePosition } : undefined,
          )
        },
        onUnhover: () => setHover(undefined),
      })
    })
    return () => {
      for (const mesh of meshes) removeHoverable(mesh)
    }
  }, [model, hiddenCadComponentIds, addHoverable, removeHoverable])
  return (
    <>
      {bounds && <FitCameraToComparison bounds={bounds} />}
      {hover && (
        <Html
          position={hover.position}
          style={{
            background: "white",
            color: "black",
            padding: "5px",
            borderRadius: "3px",
            fontFamily: "sans-serif",
            transform: "translate(1rem, 1rem)",
          }}
        >
          {hover.name}
        </Html>
      )}
    </>
  )
}

export function CadViewerGlb({
  source,
  hiddenCadComponentIds,
  ...containerProps
}: {
  source: string | ArrayBuffer
  hiddenCadComponentIds?: ReadonlySet<string>
  autoRotateDisabled?: boolean
  clickToInteractEnabled?: boolean
  onUserInteraction?: () => void
  onCameraControllerReady?: (controller: CameraController | null) => void
  referenceObject?: ReferenceObjectType | null
}) {
  const result = useGlbModel(source)

  const framing = useMemo(() => {
    if (!result?.model) return undefined
    const bounds = new THREE.Box3().setFromObject(result.model)
    if (bounds.isEmpty()) return undefined
    return {
      boardDimensions: {
        width: bounds.max.x - bounds.min.x,
        height: bounds.max.y - bounds.min.y,
      },
      boardCenter: {
        x: (bounds.min.x + bounds.max.x) / 2,
        y: (bounds.min.y + bounds.max.y) / 2,
      },
    }
  }, [result, source])

  if (!result) return <div role="status">Loading 3D view...</div>
  if (result.error)
    return <div role="alert">Unable to load 3D view: {result.error}</div>
  if (!result.model) return null
  return (
    <CadViewerContainer {...containerProps} {...framing}>
      <GlbScene
        model={result.model}
        hiddenCadComponentIds={hiddenCadComponentIds}
      />
    </CadViewerContainer>
  )
}
