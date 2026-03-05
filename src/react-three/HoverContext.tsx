import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react"
import * as THREE from "three"
import { useThree } from "./ThreeContext"

const HOVER_UPDATE_THROTTLE_MS = 33
const HOVER_POINT_EPSILON_SQ = 1e-6

export interface HoverableObject {
  object: THREE.Object3D
  onHover: (event: { mousePosition: [number, number, number] }) => void
  onUnhover: () => void
}

export interface HoverContextState {
  addHoverable: (hoverable: HoverableObject) => void
  removeHoverable: (object: THREE.Object3D) => void
}

export const HoverContext = createContext<HoverContextState | null>(null)

export const useHover = () => {
  const context = useContext(HoverContext)
  if (!context) {
    throw new Error("useHover must be used within a HoverProvider")
  }
  return context
}

export const HoverProvider = ({ children }: { children: React.ReactNode }) => {
  const { camera, renderer } = useThree()
  const [hoverables, setHoverables] = useState<HoverableObject[]>([])
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const mouse = useMemo(() => new THREE.Vector2(), [])

  const hoverablesRef = useRef(hoverables)
  hoverablesRef.current = hoverables

  const hoveredObjectRef = useRef<HoverableObject | null>(null)
  const lastHoverPointRef = useRef<THREE.Vector3 | null>(null)
  const lastHoverUpdateTimeRef = useRef(0)

  const clearHoveredObject = useCallback(() => {
    if (hoveredObjectRef.current) {
      hoveredObjectRef.current.onUnhover()
      hoveredObjectRef.current = null
    }
    lastHoverPointRef.current = null
    lastHoverUpdateTimeRef.current = 0
  }, [])

  const addHoverable = useCallback((hoverable: HoverableObject) => {
    setHoverables((prev) => [...prev, hoverable])
  }, [])

  const removeHoverable = useCallback((object: THREE.Object3D) => {
    if (hoveredObjectRef.current) {
      let isAncestor = false
      let current: THREE.Object3D | null = hoveredObjectRef.current.object
      while (current) {
        if (current === object) {
          isAncestor = true
          break
        }
        current = current.parent
      }

      if (isAncestor) {
        // The object being removed contains the hovered object.
        clearHoveredObject()
      }
    }
    setHoverables((prev) => prev.filter((h) => h.object !== object))
  }, [clearHoveredObject])

  const findHoverable = useCallback(
    (object: THREE.Object3D): HoverableObject | undefined => {
      let current: THREE.Object3D | null = object
      while (current) {
        const found = hoverablesRef.current.find((h) => h.object === current)
        if (found) return found
        current = current.parent
      }
      return undefined
    },
    [],
  )

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!renderer.domElement) return
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const objectsToIntersect = hoverablesRef.current.map((h) => h.object)

      if (objectsToIntersect.length === 0) {
        clearHoveredObject()
        return
      }

      const intersects = raycaster.intersectObjects(objectsToIntersect, true)

      if (intersects.length > 0) {
        const firstIntersect = intersects[0]!
        const newHovered = findHoverable(firstIntersect.object)

        if (newHovered) {
          const eventPayload = {
            mousePosition: [
              firstIntersect.point.x,
              firstIntersect.point.y,
              firstIntersect.point.z,
            ] as [number, number, number],
          }
          if (hoveredObjectRef.current !== newHovered) {
            hoveredObjectRef.current?.onUnhover()
            newHovered.onHover(eventPayload)
            hoveredObjectRef.current = newHovered
            lastHoverPointRef.current = firstIntersect.point.clone()
            lastHoverUpdateTimeRef.current = Date.now()
          } else {
            const lastPoint = lastHoverPointRef.current
            const hasMovedEnough =
              !lastPoint ||
              lastPoint.distanceToSquared(firstIntersect.point) >
                HOVER_POINT_EPSILON_SQ
            const now = Date.now()
            const shouldUpdate =
              hasMovedEnough &&
              now - lastHoverUpdateTimeRef.current >= HOVER_UPDATE_THROTTLE_MS
            if (shouldUpdate) {
              newHovered.onHover(eventPayload)
              lastHoverPointRef.current = firstIntersect.point.clone()
              lastHoverUpdateTimeRef.current = now
            }
          }
        } else {
          clearHoveredObject()
        }
      } else {
        clearHoveredObject()
      }
    },
    [camera, renderer, raycaster, mouse, findHoverable, clearHoveredObject],
  )

  useEffect(() => {
    const domElement = renderer.domElement
    domElement.addEventListener("mousemove", onMouseMove)
    return () => {
      domElement.removeEventListener("mousemove", onMouseMove)
    }
  }, [renderer, onMouseMove])

  const contextValue = useMemo(
    () => ({
      addHoverable,
      removeHoverable,
    }),
    [addHoverable, removeHoverable],
  )

  return (
    <HoverContext.Provider value={contextValue}>
      {children}
    </HoverContext.Provider>
  )
}
