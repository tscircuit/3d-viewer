import { Html } from "@react-three/drei"
import { GroupProps, useThree } from "@react-three/fiber"
import { useRef, useCallback } from "react"
import type { Vector3 } from "three"
import * as THREE from "three"

const Group = (props: GroupProps) => <group {...props} />

const ContainerWithTooltip = ({
  children,
  isHovered,
  onHover,
  position,
}: {
  children: React.ReactNode
  position?: Vector3 | [number, number, number]
  onHover: (e: any) => void
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
          onHover({ mousePosition: [point.x, point.y, point.z] })
        } else {
          onHover({})
        }
      } catch (error) {
        console.warn("Hover event error:", error)
        onHover({})
      }
    },
    [position],
  )

  const handlePointerLeave = useCallback(
    (e: any) => {
      e.stopPropagation()
      lastValidPointRef.current = null

      // TODO REPLACE WITH onUnhover
      onHover(null)
    },
    [onHover],
  )

  return (
    <Group
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {children}
    </Group>
  )
}

export default ContainerWithTooltip
