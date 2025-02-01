import { useMemo } from "react"
import { MTLLoader, OBJLoader, STLLoader } from "three-stdlib"

const stlLoader = new STLLoader()

export function STLModel({
  stlData,
  color,
  opacity = 1,
}: {
  stlData: ArrayBufferLike
  color?: any
  mtlData?: ArrayBufferLike
  opacity?: number
}) {
  const geom = useMemo(() => stlLoader.parse(stlData as ArrayBuffer), [stlData])

  // TODO handle mtl data

  return (
    <mesh>
      <primitive object={geom} attach="geometry" />
      <meshStandardMaterial
        color={color}
        transparent={opacity !== 1}
        opacity={opacity}
      />
      {/* <Outlines thickness={0.05} color="black" opacity={0.25} /> */}
    </mesh>
  )
}
