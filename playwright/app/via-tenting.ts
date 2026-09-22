import type { AnyCircuitElement } from "circuit-json"
import { createSilkscreenTextureForLayer } from "../../src/textures/create-silkscreen-texture-for-layer"
import { createSoldermaskTextureForLayer } from "../../src/textures/create-soldermask-texture-for-layer"
import { createTraceTextureForLayer } from "../../src/utils/trace-texture"
import fixture from "../../tests/fixtures/trace-via-tenting.json"

const circuitJson = fixture as AnyCircuitElement[]
const boardData = circuitJson.find((element) => element.type === "pcb_board")!

function renderTextures(layer: "top" | "bottom", soldermaskVisible: boolean) {
  const silkscreen = createSilkscreenTextureForLayer({
    circuitJson,
    boardData,
    layer,
    soldermaskVisible,
    traceTextureResolution: 40,
  })!
  const copper = createTraceTextureForLayer({
    circuitJson,
    boardData,
    layer,
    traceColor: "rgb(230,153,51)",
    traceTextureResolution: 40,
  })!
  const silkCanvas = silkscreen.image as HTMLCanvasElement
  const copperCanvas = copper.image as HTMLCanvasElement
  const readPixel = (canvas: HTMLCanvasElement, x: number, y: number) => {
    const canvasY = (layer === "top" ? 4 - y : 4 + y) * 40
    return Array.from(
      canvas.getContext("2d")!.getImageData((x + 6) * 40, canvasY, 1, 1).data,
    )
  }

  const preview = document.createElement("canvas")
  preview.width = silkCanvas.width
  preview.height = silkCanvas.height
  const context = preview.getContext("2d")!
  context.drawImage(copperCanvas, 0, 0)
  if (soldermaskVisible) {
    const mask = createSoldermaskTextureForLayer({
      circuitJson,
      boardData,
      layer,
      traceTextureResolution: 40,
    })!
    context.drawImage(mask.image as HTMLCanvasElement, 0, 0)
  }
  context.drawImage(silkCanvas, 0, 0)
  if (layer === "bottom") preview.style.transform = "rotate(180deg)"
  const heading = document.createElement("h2")
  heading.textContent = `${layer}: soldermask ${soldermaskVisible ? "visible" : "hidden"}`
  const order = document.createElement("p")
  order.textContent =
    layer === "top"
      ? "Left: inherited. Right: explicit override."
      : "Left: explicit override. Right: inherited."
  document.getElementById("textures")!.append(heading, order, preview)

  return {
    inheritedText: readPixel(silkCanvas, -2, 0),
    overriddenText: readPixel(silkCanvas, 2, 0),
    inheritedRing: readPixel(copperCanvas, -2, 0.7),
    overriddenRing: readPixel(copperCanvas, 2, 0.7),
    drill: readPixel(copperCanvas, -2, 0),
  }
}

const pixels = {
  top: renderTextures("top", true),
  bottom: renderTextures("bottom", true),
  topWithoutMask: renderTextures("top", false),
  bottomWithoutMask: renderTextures("bottom", false),
}
document.querySelector('[data-testid="texture-pixels"]')!.textContent =
  JSON.stringify(pixels, null, 2)
