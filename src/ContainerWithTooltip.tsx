import { Html } from "@react-three/drei"
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
  return (
    <group
      {...{
        onPointerOver: () => onHover(componentId),
        onPointerOut: () => onHover(null),
      }}
    >
      {children}
      {isHovered && (
        <Html
          position={position}
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
