import { Html, Text } from "@react-three/drei"
import type { CadComponent } from "circuit-json"
import { useState, useCallback } from "react"
import ContainerWithTooltip from "src/ContainerWithTooltip"

export const Error3d = ({
  error,
  cad_component,
}: { error: any; cad_component?: CadComponent }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [hoverPosition, setHoverPosition] = useState<
    [number, number, number] | null
  >(null)

  const handleHover = useCallback((e: any) => {
    if (e?.mousePosition) {
      setIsHovered(true)
      setHoverPosition(e.mousePosition)
    } else {
      setIsHovered(false)
      setHoverPosition(null)
    }
  }, [])

  const handleUnhover = useCallback(() => {
    setIsHovered(false)
    setHoverPosition(null)
  }, [])

  let position = [0, 0, 0]
  if (cad_component?.position) {
    position = [
      cad_component.position.x,
      cad_component.position.y,
      cad_component.position.z,
    ]
    // make sure the position doesn't have any NaN values
    position = position.map((p) => (Number.isNaN(p) ? 0 : p))
  }

  return (
    <>
      <ContainerWithTooltip
        isHovered={isHovered}
        onHover={handleHover}
        onUnhover={handleUnhover}
        position={position as any}
      >
        <group
          // @ts-expect-error
          position={position}
        >
          <mesh
            renderOrder={-99999}
            rotation={[Math.PI / 4, Math.PI / 4, 0]}
            ref={(mesh) => {
              if (mesh) {
                mesh.renderOrder = 999999
              }
            }}
          >
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial
              depthTest={false}
              transparent
              color="red"
              opacity={0.5}
            />
          </mesh>
          <Text
            scale={[0.1, 0.1, 0.1]}
            color="red"
            anchorX="center"
            anchorY="middle"
            depthOffset={-99999}
          >
            {error.toString().slice(0, 50)}...
          </Text>
        </group>
      </ContainerWithTooltip>
      {isHovered && hoverPosition ? (
        <Html
          position={hoverPosition}
          style={{
            fontFamily: "sans-serif",
            transform: "translate3d(50%, 50%, 0)",
            backgroundColor: "white",
            padding: "6px",
            borderRadius: "4px",
            color: "red",
            pointerEvents: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
          }}
        >
          {error.toString()}
        </Html>
      ) : null}
    </>
  ) as any
}
