import ContainerWithTooltip from "src/ContainerWithTooltip"
import { useGlobalObjLoader } from "src/hooks/use-global-obj-loader"
import type { Euler, Vector3 } from "three"

export function MixedStlModel({
  url,
  position,
  rotation,
  onHover,
  onUnhover,
  isHovered,
}: {
  url: string
  position?: Vector3 | [number, number, number]
  rotation?: Euler | [number, number, number]
  onHover: (e: any) => void
  onUnhover: () => void
  isHovered: boolean
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
    throw obj
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
