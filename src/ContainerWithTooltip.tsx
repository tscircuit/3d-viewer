import { Html } from "@react-three/drei"
import { GroupProps } from "@react-three/fiber"
import { useState } from "react"
import type { Vector3 } from "three"

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
  const [mousePosition, setMousePosition] = useState<[number, number, number]>([0, 0, 0])
  
  const groupProps: GroupProps = {
    position,
    onPointerEnter: (e) => {
      e.stopPropagation()
      setMousePosition([e.point.x, e.point.y, e.point.z])
      onHover(componentId)
    },
    onPointerMove: (e) => {
      e.stopPropagation()
      setMousePosition([e.point.x, e.point.y, e.point.z])
    },
    onPointerLeave: (e) => {
      e.stopPropagation()
      onHover(null)
    }
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