import { useEffect, useState } from "react"
import { useGlobalObjLoader } from "src/hooks/use-global-obj-loader"
import { Euler, Vector3 } from "three"
import { MTLLoader, OBJLoader } from "three-stdlib"

export function MixedStlModel({
  url,
  position,
  rotation,
}: {
  url: string
  position?: Vector3 | [number, number, number]
  rotation?: Euler | [number, number, number]
}) {
  const obj = useGlobalObjLoader(url)

  if (!obj) {
    return (
      <mesh position={position}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial transparent color="red" opacity={0.25} />
      </mesh>
    )
  }

  // Check if obj is valid before rendering
  if (obj instanceof Error) {
    return (
      <mesh position={position}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial transparent color="red" opacity={0.5} />
        <meshBasicMaterial color="black" />
      </mesh>
    )
  }

  return <primitive rotation={rotation} position={position} object={obj} />
}