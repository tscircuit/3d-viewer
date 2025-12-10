import * as THREE from "three"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"

export function createPanelOutlineTextureForLayer({
  layer,
  circuitJson,
  panelData,
  outlineColor = "black",
  traceTextureResolution,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  panelData: PcbBoard // It will be a panel, but has board-like properties
  outlineColor?: string
  traceTextureResolution: number
}): THREE.CanvasTexture | null {
  const boardsInPanel = su(circuitJson)
    .pcb_board.list()
    .filter((b) => b.pcb_panel_id === panelData.pcb_board_id)

  if (boardsInPanel.length === 0) {
    return null
  }

  const canvas = document.createElement("canvas")
  const canvasWidth = Math.floor(panelData.width! * traceTextureResolution)
  const canvasHeight = Math.floor(panelData.height! * traceTextureResolution)
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  if (layer === "bottom") {
    ctx.translate(0, canvasHeight)
    ctx.scale(1, -1)
  }

  ctx.strokeStyle = outlineColor
  ctx.lineWidth = 0.05 * traceTextureResolution // 0.05mm line width

  const canvasXFromPcb = (pcbX: number) =>
    (pcbX - panelData.center.x + panelData.width! / 2) * traceTextureResolution
  const canvasYFromPcb = (pcbY: number) =>
    (-(pcbY - panelData.center.y) + panelData.height! / 2) *
    traceTextureResolution

  boardsInPanel.forEach((board) => {
    if (board.outline && board.outline.length >= 2) {
      ctx.beginPath()
      board.outline.forEach((point, index) => {
        const x = canvasXFromPcb(point.x)
        const y = canvasYFromPcb(point.y)
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.closePath()
      ctx.stroke()
    } else {
      // Rectangular board
      const width = board.width!
      const height = board.height!
      const { x: centerX, y: centerY } = board.center
      const x = canvasXFromPcb(centerX - width / 2)
      const y = canvasYFromPcb(centerY + height / 2)
      ctx.strokeRect(
        x,
        y,
        width * traceTextureResolution,
        height * traceTextureResolution,
      )
    }
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
