import { useLoader } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"
import { MTLLoader, OBJLoader, STLLoader } from "three-stdlib"

export function STLModel({
  stlUrl,
  mtlUrl,
  color,
  opacity = 1,
}: {
  stlUrl: string
  color?: any
  mtlUrl?: string
  opacity?: number
}) {
  const geom = useLoader(STLLoader, stlUrl)
  const mesh = useRef<THREE.Mesh>()

  // TODO handle mtl url

  return (
    <mesh ref={mesh as any}>
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
