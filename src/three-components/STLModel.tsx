import { useEffect, useMemo, useState } from "react"
import { useThree } from "src/react-three/ThreeContext"
import * as THREE from "three"
import { STLLoader } from "three-stdlib"
import type { LayerType } from "../hooks/use-stls-from-geom"

export function STLModel({
  stlUrl,
  stlData,
  color,
  opacity = 1,
  layerType,
}: {
  stlUrl?: string
  stlData?: ArrayBuffer
  color?: any
  opacity?: number
  layerType?: LayerType
}) {
  const { rootObject } = useThree()
  const [geom, setGeom] = useState<THREE.BufferGeometry | null>(null)

  useEffect(() => {
    const loader = new STLLoader()
    let isActive = true
    const setLoadedGeometry = (geometry: THREE.BufferGeometry) => {
      if (!isActive) {
        geometry.dispose()
        return
      }
      setGeom(geometry)
    }

    if (stlData) {
      try {
        const geometry = loader.parse(stlData)
        setLoadedGeometry(geometry)
      } catch (e) {
        console.error("Failed to parse STL data", e)
        setGeom(null)
      }
      return () => {
        isActive = false
      }
    }
    if (stlUrl) {
      loader.load(
        stlUrl,
        (geometry) => {
          setLoadedGeometry(geometry)
        },
        undefined,
        (error) => {
          if (!isActive) return
          console.error(`Failed to load STL model from ${stlUrl}`, error)
          setGeom(null)
        },
      )
    }
    return () => {
      isActive = false
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
        for (const material of mesh.material) {
          material.dispose()
        }
      } else {
        mesh.material.dispose()
      }
    }
  }, [rootObject, mesh])

  return null
}
