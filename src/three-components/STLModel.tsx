import { useEffect, useMemo, useState } from "react"
import { useThree } from "src/react-three/ThreeContext"
import * as THREE from "three"
import { STLLoader } from "three-stdlib"
import type { LayerType } from "../hooks/use-stls-from-geom"
import { loadCachedStlGeometry } from "../utils/load-cached-stl-geometry"

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
  mtlUrl?: string
  opacity?: number
  layerType?: LayerType
}) {
  const { rootObject } = useThree()
  const [geom, setGeom] = useState<THREE.BufferGeometry | null>(null)

  useEffect(() => {
    if (stlData) {
      const loader = new STLLoader()
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
      let isMounted = true
      loadCachedStlGeometry(stlUrl)
        .then((geometry) => {
          if (!isMounted) {
            geometry.dispose()
            return
          }
          setGeom(geometry)
        })
        .catch((error) => {
          if (!isMounted) return
          console.error(`Failed to load STL model from ${stlUrl}`, error)
          setGeom(null)
        })

      return () => {
        isMounted = false
      }
    }

    setGeom(null)
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
