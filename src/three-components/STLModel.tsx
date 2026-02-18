import { useState, useEffect, useMemo } from "react"
import * as THREE from "three"
import { STLLoader } from "three-stdlib"
import { useThree } from "src/react-three/ThreeContext"
import type { LayerType } from "../hooks/use-stls-from-geom"

export function STLModel({
  stlUrl,
  stlData,
  mtlUrl,
  color,
  opacity = 1,
  layerType,
}: {
  stlUrl?: string
  stlData?: ArrayBuffer
  color?: any
  mtlUrl?: string
  opacity?: number
  layerType?: LayerType
}) {
  const { rootObject } = useThree()
  const [geom, setGeom] = useState<THREE.BufferGeometry | null>(null)

  useEffect(() => {
    const loader = new STLLoader()
    if (stlData) {
      try {
        const geometry = loader.parse(stlData)
        setGeom(geometry)
      } catch (e) {
        console.error("Failed to parse STL data", e)
        setGeom(null)
      }
      return
    }
    if (stlUrl) {
      loader.load(stlUrl, (geometry) => {
        setGeom(geometry)
      })
    }
  }, [stlUrl, stlData])

  const mesh = useMemo(() => {
    if (!geom) return null
    const isBoardLayer = layerType === "board"
    const material = new THREE.MeshStandardMaterial({
      color: Array.isArray(color)
        ? new THREE.Color(color[0], color[1], color[2])
        : color,
      transparent: opacity !== 1,
      opacity: opacity,
      polygonOffset: isBoardLayer,
      polygonOffsetFactor: isBoardLayer ? 6 : 0,
      polygonOffsetUnits: isBoardLayer ? 6 : 0,
    })
    const createdMesh = new THREE.Mesh(geom, material)
    createdMesh.renderOrder = isBoardLayer ? -1 : 1
    return createdMesh
  }, [geom, color, opacity, layerType])

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
