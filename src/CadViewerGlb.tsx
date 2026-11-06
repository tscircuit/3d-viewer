import {
  type ComponentProps,
  useEffect,
  useLayoutEffect,
  useState,
} from "react"
import { useGlbModel } from "./hooks/useGlbModel"
import * as THREE from "three"
import { CadViewerContainer } from "./CadViewerContainer"
import type { CameraController } from "./hooks/cameraAnimation"
import type { ReferenceObjectType } from "./reference-objects/reference-object"
import { useThree } from "./react-three/ThreeContext"
import { useHover } from "./react-three/HoverContext"
import { Html } from "./react-three/Html"
import { FitCameraToComparison } from "./three-components/reference-object"
import {
  isObjectHidden,
  type ObjectVisibility,
} from "./utils/object-visibility"
import { getGlbComponentMetadata } from "./utils/prerendered-glb"

export function GlbScene({
  model,
  objectVisibility,
}: {
  model: THREE.Group
  objectVisibility?: ObjectVisibility
}) {
  const { rootObject } = useThree()
  const { addHoverable, removeHoverable } = useHover()
  const [hover, setHover] = useState<{
    name: string
    position: [number, number, number]
  }>()
  useLayoutEffect(() => {
    rootObject.add(model)
    return () => {
      rootObject.remove(model)
    }
  }, [rootObject, model])
  useEffect(() => {
    setHover(undefined)
    // Exported boards, vias and cables carry no component id. They have no
    // identity to hide by, but isolating another object hides them.
    const applyVisibility = (object: THREE.Object3D, inComponent: boolean) => {
      const id = object.userData.cad_component_id
      if (typeof id === "string")
        object.visible = !isObjectHidden(objectVisibility, id)
      else if (!inComponent && object instanceof THREE.Mesh)
        object.visible = !isObjectHidden(objectVisibility, undefined)
      for (const child of object.children)
        applyVisibility(child, inComponent || typeof id === "string")
    }
    applyVisibility(model, false)
  }, [model, objectVisibility])
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
          let visible = true
          while (object) {
            name ??= getGlbComponentMetadata(object)?.componentName
            visible &&= object.visible
            object = object.parent
          }
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
  }, [model, objectVisibility, addHoverable, removeHoverable])
  return (
    <>
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
  objectVisibility,
  ...containerProps
}: {
  source: string | ArrayBuffer
  objectVisibility?: ObjectVisibility
  autoRotateDisabled?: boolean
  clickToInteractEnabled?: boolean
  onUserInteraction?: () => void
  onCameraControllerReady?: (controller: CameraController | null) => void
  referenceObject?: ReferenceObjectType | null
}) {
  const { model, isLoading, error } = useGlbModel(source)
  const message = error
    ? `Unable to load 3D view: ${error}`
    : "Loading 3D view..."
  const role = error ? "alert" : "status"
  if (!model) return <div role={role}>{message}</div>

  return (
    <>
      <GlbViewport
        model={model}
        objectVisibility={objectVisibility}
        {...containerProps}
      />
      {(isLoading || error) && (
        <div role={role} style={{ position: "absolute", top: 12, left: 12 }}>
          {message}
        </div>
      )}
    </>
  )
}

function GlbViewport({
  model,
  objectVisibility,
  ...containerProps
}: Omit<ComponentProps<typeof CadViewerContainer>, "children"> & {
  model: THREE.Group
  objectVisibility?: ObjectVisibility
}) {
  const [framing] = useState(() => {
    const box = new THREE.Box3().setFromObject(model)
    if (box.isEmpty()) return undefined
    return {
      bounds: {
        minX: box.min.x,
        maxX: box.max.x,
        minY: box.min.y,
        maxY: box.max.y,
        minZ: box.min.z,
        maxZ: box.max.z,
      },
      boardDimensions: {
        width: box.max.x - box.min.x,
        height: box.max.y - box.min.y,
      },
      boardCenter: {
        x: (box.min.x + box.max.x) / 2,
        y: (box.min.y + box.max.y) / 2,
      },
    }
  })
  return (
    <CadViewerContainer
      {...containerProps}
      boardDimensions={framing?.boardDimensions}
      boardCenter={framing?.boardCenter}
    >
      {framing && <FitCameraToComparison bounds={framing.bounds} />}
      <GlbScene model={model} objectVisibility={objectVisibility} />
    </CadViewerContainer>
  )
}
