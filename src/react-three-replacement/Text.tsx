import React, { useEffect, useMemo } from "react"
import * as THREE from "three"
import { Text as TroikaText } from "troika-three-text"
import { useThree } from "./ThreeContext"

interface TextProps {
  children: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  color?: string | number
  fontSize?: number
  anchorX?: "center" | "left" | "right"
  anchorY?: "middle" | "top" | "bottom"
  depthOffset?: number
  parent?: THREE.Object3D
}

export const Text: React.FC<TextProps> = ({
  children,
  parent,
  position,
  rotation,
  scale,
  color,
  fontSize,
  anchorX,
  anchorY,
  depthOffset,
}) => {
  const { rootObject } = useThree()

  const mesh = useMemo(() => {
    const textMesh = new TroikaText()

    textMesh.text = children
    if (position) textMesh.position.fromArray(position)
    if (rotation) textMesh.rotation.fromArray(rotation)
    if (scale) textMesh.scale.fromArray(scale)
    textMesh.color = color || "white"
    textMesh.fontSize = fontSize || 1
    textMesh.anchorX = anchorX || "center"
    textMesh.anchorY = anchorY || "middle"
    textMesh.depthOffset = depthOffset || 0
    textMesh.font = null // Use browser's default sans-serif font

    // troika-three-text needs sync to be called to update the mesh
    textMesh.sync()

    return textMesh
  }, [
    children,
    position,
    rotation,
    scale,
    color,
    fontSize,
    anchorX,
    anchorY,
    depthOffset,
  ])

  useEffect(() => {
    const parentObject = parent || rootObject
    if (!parentObject || !mesh) return
    parentObject.add(mesh)
    return () => {
      parentObject.remove(mesh)
      mesh.dispose()
    }
  }, [rootObject, parent, mesh])

  return null
}
