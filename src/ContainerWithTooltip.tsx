import { Html } from "@react-three/drei"
import { GroupProps, useThree } from "@react-three/fiber"
import { useRef, useCallback } from "react"
import type { Vector3 } from "three"
import * as THREE from "three"

const Group = (props: GroupProps) => <group {...props} />

const ContainerWithTooltip = ({
  children,
  isHovered,
  isHighlighted = false,
  onHover,
  onUnhover,
  position,
}: {
  children: React.ReactNode
  position?: Vector3 | [number, number, number]
  onHover: (e: any) => void
  onUnhover: () => void
  isHovered: boolean
  isHighlighted?: boolean
}) => {
  const lastValidPointRef = useRef<THREE.Vector3 | null>(null)

  const handlePointerHover = useCallback(
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
        onHover({}) // Keep sending empty object if error occurs during hover
      }
    },
    [onHover, position],
  )

  const handlePointerLeave = useCallback(
    (e: any) => {
      e.stopPropagation()
      lastValidPointRef.current = null
      onUnhover()
    },
    [onUnhover],
  )

  return (
    <Group
      onPointerEnter={handlePointerHover}
      onPointerMove={handlePointerHover}
      onPointerLeave={handlePointerLeave}
    >
      {children}
      {isHighlighted && (
        <>
          {/* Small sphere covering - more subtle and focused */}
          <mesh position={position}>
            <sphereGeometry args={[1.2, 16, 16]} />
            <meshBasicMaterial
              color="cyan"
              transparent
              opacity={0.25}
              wireframe
            />
          </mesh>
        </>
      )}
    </Group>
  )
}

export default ContainerWithTooltip
