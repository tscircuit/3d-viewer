import type { GroupProps, ThreeEvent } from "@react-three/fiber"
import { useRef, useCallback } from "react"
import * as THREE from "three"
import type * as React from "react"
import type { TooltipEvent } from "./events.ts"

const Group = (props: GroupProps) => <group {...props} />

export interface RaycastEvent {
  point: THREE.Vector3
}

export interface HoverProps<E extends RaycastEvent = RaycastEvent> {
  onHover: (event: E) => void
  onUnhover: (event: E) => void
  isHovered: boolean
}

export function ContainerWithTooltip({
  children,
  onHover,
  onUnhover,
  position,
}: React.PropsWithChildren<
  HoverProps & { position?: THREE.Vector3 | [number, number, number] }
>) {
  const lastValidPointRef = useRef<THREE.Vector3 | null>(null)

  const handlePointerEnter = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()

      try {
        // Fallback to event position if raycaster fails
        const point =
          e.point ||
          (e.intersections && e.intersections.length > 0
            ? e.intersections[0]!.point
            : null) ||
          (position
            ? new THREE.Vector3(...(position as [number, number, number]))
            : null)

        if (point) {
          lastValidPointRef.current = point
          onHover({ point })
        }
      } catch (error) {
        console.warn("Hover event error:", error)
      }
    },
    [position],
  )

  const handlePointerLeave = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const point = lastValidPointRef.current
      if (!point) return

      e.stopPropagation()
      lastValidPointRef.current = null

      onUnhover({ point })
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
