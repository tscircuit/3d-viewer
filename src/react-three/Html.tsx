import React, { useRef, useEffect, useState } from "react"
import ReactDOM from "react-dom"
import * as THREE from "three"
import { useFrame, useThree } from "./ThreeContext"

interface HtmlProps {
  children: React.ReactNode
  position: [number, number, number]
  style?: React.CSSProperties
}

export const Html: React.FC<HtmlProps> = ({ children, position, style }) => {
  const { camera, renderer } = useThree()
  const el = useRef(document.createElement("div"))
  const [portal, setPortal] = useState<React.ReactPortal | null>(null)

  useEffect(() => {
    const rendererNode = renderer?.domElement.parentNode as HTMLElement
    if (!rendererNode) return

    // Ensure the parent node has relative positioning for proper tooltip positioning
    if (
      rendererNode.style.position !== "relative" &&
      rendererNode.style.position !== "absolute"
    ) {
      rendererNode.style.position = "relative"
    }

    rendererNode.appendChild(el.current)
    setPortal(ReactDOM.createPortal(children, el.current))

    return () => {
      if (rendererNode.contains(el.current)) {
        rendererNode.removeChild(el.current)
      }
    }
  }, [renderer, children])

  useFrame(() => {
    if (!camera || !el.current || !renderer) return

    const vector = new THREE.Vector3(...position)
    vector.project(camera)

    // Get canvas position and size
    const rect = renderer.domElement.getBoundingClientRect()
    // NDC [-1,1] to pixel coordinates within canvas
    const x = Math.round(((vector.x + 1) / 2) * rect.width)
    const y = Math.round(((-vector.y + 1) / 2) * rect.height)

    // Position relative to the canvas container, not the page
    el.current.style.position = "absolute"
    el.current.style.left = `${x}px`
    el.current.style.top = `${y}px`
    el.current.style.pointerEvents = "none"
    el.current.style.zIndex = "1000"

    if (style) {
      Object.assign(el.current.style, style)
    }
  }, [camera, renderer, position, style])

  return portal
}
