import { ContainerWithTooltip, type HoverProps } from "src/ContainerWithTooltip"
import { useGlobalObjLoader } from "src/hooks/use-global-obj-loader"
import type { Euler, Vector3 } from "three"

export type * as tooltip from "src/ContainerWithTooltip"

export function MixedStlModel({
  url,
  position,
  rotation,
  onHover,
  onUnhover,
  isHovered,
}: HoverProps & {
  url: string
  position?: Vector3 | [number, number, number]
  rotation?: Euler | [number, number, number]
}) {
  const obj = useGlobalObjLoader(url)

  if (!obj) {
    return (
      <ContainerWithTooltip
        isHovered={isHovered}
        onHover={onHover}
        onUnhover={onUnhover}
      >
        <mesh position={position}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial transparent color="red" opacity={0.25} />
        </mesh>
      </ContainerWithTooltip>
    )
  }

  // Check if obj is valid before rendering
  if (obj instanceof Error) {
    return (
      <ContainerWithTooltip
        isHovered={isHovered}
        onHover={onHover}
        onUnhover={onUnhover}
      >
        <mesh position={position}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial transparent color="red" opacity={0.5} />
          <meshBasicMaterial color="red" />
        </mesh>
      </ContainerWithTooltip>
    )
  }
  return (
    <ContainerWithTooltip
      isHovered={isHovered}
      onHover={onHover}
      onUnhover={onUnhover}
    >
      <primitive rotation={rotation} position={position} object={obj} />
    </ContainerWithTooltip>
  )
}
