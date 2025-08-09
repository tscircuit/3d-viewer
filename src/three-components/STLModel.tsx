import { useState, useEffect, useMemo } from "react"
import * as THREE from "three"
import { STLLoader } from "three-stdlib"
import { useThree } from "src/react-three/ThreeContext"

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
  const { rootObject } = useThree()
  const [geom, setGeom] = useState<THREE.BufferGeometry | null>(null)

  useEffect(() => {
    const loader = new STLLoader()
    loader.load(stlUrl, (geometry) => {
      setGeom(geometry)
    })
  }, [stlUrl])

  const mesh = useMemo(() => {
    if (!geom) return null
    const material = new THREE.MeshStandardMaterial({
      color: Array.isArray(color)
        ? new THREE.Color(color[0], color[1], color[2])
        : color,
      transparent: opacity !== 1,
      opacity: opacity,
    })
    return new THREE.Mesh(geom, material)
  }, [geom, color, opacity])

  useEffect(() => {
    if (!rootObject || !mesh) return
    rootObject.add(mesh)
    return () => {
      rootObject.remove(mesh)
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose())
      } else {
        mesh.material.dispose()
      }
    }
  }, [rootObject, mesh])

  return null
}
