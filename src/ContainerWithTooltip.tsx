import { Html } from "@react-three/drei"
import { GroupProps, useThree } from "@react-three/fiber"
import { useRef, useCallback } from "react"
import type { Vector3 } from "three"
import * as THREE from "three"

const ContainerWithTooltip = ({
  children,
  isHovered,
  onHover,
  componentId,
  name,
  position,
}: {
  children: React.ReactNode
  componentId: string
  name: string
  position?: Vector3 | [number, number, number]
  onHover: (
    id: string | null,
    name?: string,
    mousePosition?: [number, number, number],
  ) => void
  isHovered: boolean
}) => {
  const lastValidPointRef = useRef<THREE.Vector3 | null>(null)

  const handlePointerEnter = useCallback(
    (e: any) => {
      e.stopPropagation()

      try {
        // Fallback to event position if raycaster fails
        const point =
          e.point ||
          (e.intersections && e.intersections.length > 0
            ? e.intersections[0].point
            : null) ||
          (position
            ? new THREE.Vector3(...(position as [number, number, number]))
            : null)

        if (point) {
          lastValidPointRef.current = point
          onHover(componentId, name, [point.x, point.y, point.z])
        } else {
          onHover(componentId, name)
        }
      } catch (error) {
        console.warn("Hover event error:", error)
        onHover(componentId, name)
      }
    },
    [componentId, name, onHover, position],
  )

  const handlePointerLeave = useCallback(
    (e: any) => {
      e.stopPropagation()
      lastValidPointRef.current = null
      onHover(null)
    },
    [onHover],
  )

  const groupProps: GroupProps = {
    onPointerEnter: handlePointerEnter,
    onPointerMove: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
  }

  return <group {...groupProps}>{children}</group>
}

export default ContainerWithTooltip
