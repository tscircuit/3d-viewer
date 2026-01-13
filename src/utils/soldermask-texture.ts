import * as THREE from "three"
import { useLoader } from "@react-three/fiber"

interface Props {
  width: number
  height: number
  depth: number
  textureUrl?: string 
}

export const Box = ({ width, height, depth, textureUrl }: Props) => {
  // UseLoader wuxuu soo rarayaa sawirka PNG-ga ah ee textureUrl laga keenay
  const texture = textureUrl ? useLoader(THREE.TextureLoader, textureUrl) : null

  if (texture) {
    texture.anisotropy = 16
    texture.needsUpdate = true
  }

  return (
    <mesh>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial 
        color={texture ? "white" : "#cc5500"} 
        map={texture} 
        roughness={0.75}
        metalness={0.2}
      />
    </mesh>
  )
}
