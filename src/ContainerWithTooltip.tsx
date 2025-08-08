import React, { useEffect } from "react"
import { useHover } from "./react-three-replacement/HoverContext"
import * as THREE from "three"

const ContainerWithTooltip = ({
  children,
  object,
  onHover,
  onUnhover,
}: {
  children: React.ReactNode
  object?: THREE.Object3D | null
  onHover: (e: any) => void
  onUnhover: () => void
  isHovered: boolean
}) => {
  const { addHoverable, removeHoverable } = useHover()

  useEffect(() => {
    if (!object) return

    const hoverable = {
      object,
      onHover,
      onUnhover,
    }

    addHoverable(hoverable)
    return () => {
      removeHoverable(object)
    }
  }, [object, onHover, onUnhover, addHoverable, removeHoverable])

  return <>{children}</>
}

export default ContainerWithTooltip
