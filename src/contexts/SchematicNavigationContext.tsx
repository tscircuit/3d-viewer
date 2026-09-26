import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type MutableRefObject,
} from "react"
import type { ThreeContextState } from "../react-three/ThreeContext"
import { ThreeContext, useThree } from "../react-three/ThreeContext"
import type { CadComponent } from "circuit-json"
import * as THREE from "three"

// Scoped to a viewer so multiple previews never pick from each other's scenes.
export const SchematicNavigationContext =
  createContext<MutableRefObject<ThreeContextState | null> | null>(null)

export const SchematicNavigationScene = () => {
  const sceneRef = useContext(SchematicNavigationContext)
  const scene = useThree()
  useEffect(() => {
    if (!sceneRef) return
    sceneRef.current = scene
    return () => {
      sceneRef.current = null
    }
  }, [sceneRef, scene])
  return null
}

// All model loaders add their meshes to rootObject. Give each component an
// identity-bearing parent without changing any loader's transforms.
export const CadComponentGroup = ({
  cadComponent,
  children,
}: {
  cadComponent: CadComponent
  children: React.ReactNode
}) => {
  const scene = useThree()
  const group = useMemo(() => new THREE.Group(), [])
  group.userData.pcb_component_id = cadComponent.pcb_component_id
  useEffect(() => {
    scene.rootObject.add(group)
    return () => {
      scene.rootObject.remove(group)
    }
  }, [scene.rootObject, group])
  const context = useMemo(
    () => ({ ...scene, rootObject: group }),
    [scene, group],
  )
  return (
    <ThreeContext.Provider value={context}>{children}</ThreeContext.Provider>
  )
}
