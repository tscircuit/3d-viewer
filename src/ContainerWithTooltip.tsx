import { Html } from "@react-three/drei"
import { GroupProps, useFrame, useThree } from "@react-three/fiber"
import { useRef, useState } from "react"
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
  onHover: (id: string | null) => void
  isHovered: boolean
}) => {
  const [mousePosition, setMousePosition] = useState<[number, number, number]>([
    0, 0, 0,
  ])
  const { camera } = useThree()
  const mouseRef = useRef(new THREE.Vector2())

  // Update tooltip position on every frame when hovered
  useFrame(() => {
    if (isHovered) {
      // Project the stored mouse coordinates into 3D space
      const vector = new THREE.Vector3(
        mouseRef.current.x,
        mouseRef.current.y,
        0.5,
      )
      vector.unproject(camera)
      setMousePosition([vector.x, vector.y, vector.z])
    }
  })

  const groupProps: GroupProps = {
    onPointerEnter: (e) => {
      e.stopPropagation()
      // Store normalized mouse coordinates
      mouseRef.current.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      )
      onHover(componentId)
    },
    onPointerMove: (e) => {
      e.stopPropagation()
      // Update normalized mouse coordinates
      mouseRef.current.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      )
    },
    onPointerLeave: (e) => {
      e.stopPropagation()
      onHover(null)
    },
  }

  return (
    <group {...groupProps}>
      {children}
      {isHovered && (
        <Html
          position={mousePosition}
          style={{
            fontFamily: "sans-serif",
            transform: "translate3d(50%, 50%, 0)",
            backgroundColor: "white",
            padding: "5px",
            borderRadius: "3px",
            pointerEvents: "none",
          }}
        >
          {name}
        </Html>
      )}
    </group>
  )
}

export default ContainerWithTooltip
