import { expect, test } from "bun:test"
import * as THREE from "three"
import { colors as defaultColors } from "../src/geoms/constants"
import { createBoardReliefTextures } from "../src/utils/create-board-relief-textures"

type PixelImage = {
  data: Uint8ClampedArray
  width: number
  height: number
}

class TestCanvas {
  private pixels = new Uint8ClampedArray()
  private canvasWidth = 0
  private canvasHeight = 0

  get width() {
    return this.canvasWidth
  }

  set width(value: number) {
    this.canvasWidth = value
    this.reset()
  }

  get height() {
    return this.canvasHeight
  }

  set height(value: number) {
    this.canvasHeight = value
    this.reset()
  }

  setPixel(x: number, y: number, rgba: [number, number, number, number]) {
    this.pixels.set(rgba, (y * this.width + x) * 4)
  }

  channel(x: number, y: number, channel: number) {
    return this.pixels[(y * this.width + x) * 4 + channel] ?? 0
  }

  snapshot() {
    return this.pixels.slice()
  }

  getContext() {
    return {
      getImageData: (x: number, y: number, width: number, height: number) => {
        const data = new Uint8ClampedArray(width * height * 4)
        for (let row = 0; row < height; row += 1) {
          data.set(
            this.pixels.subarray(
              ((y + row) * this.width + x) * 4,
              ((y + row) * this.width + x + width) * 4,
            ),
            row * width * 4,
          )
        }
        return { data, width, height } satisfies PixelImage
      },
      createImageData: (width: number, height: number) =>
        ({
          data: new Uint8ClampedArray(width * height * 4),
          width,
          height,
        }) satisfies PixelImage,
      putImageData: (image: PixelImage, x: number, y: number) => {
        for (let row = 0; row < image.height; row += 1) {
          this.pixels.set(
            image.data.subarray(
              row * image.width * 4,
              (row + 1) * image.width * 4,
            ),
            ((y + row) * this.width + x) * 4,
          )
        }
      },
    }
  }

  private reset() {
    this.pixels = new Uint8ClampedArray(this.width * this.height * 4)
  }
}

const createCanvas = (width: number, height: number) => {
  const canvas = new TestCanvas()
  canvas.width = width
  canvas.height = height
  return canvas
}

const asTexture = (canvas: TestCanvas) =>
  new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement)

const withCanvasDocument = (run: () => void) => {
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: {
      createElement: (tag: string) => {
        if (tag !== "canvas") throw new Error(`Unexpected element: ${tag}`)
        return new TestCanvas()
      },
    },
  })
  try {
    run()
  } finally {
    Object.assign(globalThis, { document: previousDocument })
  }
}

const fillSoldermask = (
  canvas: TestCanvas,
  color: [number, number, number] = [20, 110, 55],
) => {
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      // This bright green used to trigger the g > 88 masked-copper heuristic.
      canvas.setPixel(x, y, [...color, 255])
    }
  }
}

test("empty PCB has no masked-copper relief and retains its color texture", () => {
  withCanvasDocument(() => {
    const board = createCanvas(4, 4)
    fillSoldermask(board)
    const boardColorBefore = board.snapshot()

    const relief = createBoardReliefTextures(asTexture(board))
    expect(relief).not.toBeNull()
    expect(board.snapshot()).toEqual(boardColorBefore)

    const bump = relief!.bumpMap.image as unknown as TestCanvas
    const height = bump.channel(0, 0, 0)
    expect(height).toBeGreaterThan(170)
    expect(bump.channel(3, 3, 0)).toBe(height)
  })
})

test("trace mask applies masked-copper relief only on trace geometry", () => {
  withCanvasDocument(() => {
    const board = createCanvas(4, 4)
    fillSoldermask(board)
    const traceMask = createCanvas(4, 4)
    traceMask.setPixel(2, 2, [255, 255, 255, 255])

    const relief = createBoardReliefTextures(
      asTexture(board),
      asTexture(traceMask),
    )
    expect(relief).not.toBeNull()

    const bump = relief!.bumpMap.image as unknown as TestCanvas
    expect(bump.channel(2, 2, 0)).toBeLessThan(bump.channel(1, 1, 0) - 80)
  })
})

test("masked-copper relief works for every non-green preset", () => {
  const masks: Array<[string, [number, number, number]]> = [
    ["blue", [0, 74, 171]],
    ["yellow", [174, 128, 0]],
    ["white", [221, 221, 221]],
    ["red", [101, 2, 2]],
    ["black", [0, 0, 0]],
    ["purple", [21, 0, 138]],
  ]

  withCanvasDocument(() => {
    for (const [name, color] of masks) {
      const board = createCanvas(4, 4)
      fillSoldermask(board, color)
      const traceMask = createCanvas(4, 4)
      traceMask.setPixel(2, 2, [255, 255, 255, 255])

      const relief = createBoardReliefTextures(
        asTexture(board),
        asTexture(traceMask),
      )
      expect(relief, name).not.toBeNull()

      const bump = relief!.bumpMap.image as unknown as TestCanvas
      expect(bump.channel(2, 2, 0), name).toBeLessThan(
        bump.channel(1, 1, 0) - 30,
      )
    }
  })
})

test("soldermask coverage wins when its RGB exactly matches copper", () => {
  withCanvasDocument(() => {
    const copperRgb = defaultColors.copper.map((channel) =>
      Math.round(channel * 255),
    ) as [number, number, number]
    const exposedCopper = createCanvas(4, 4)
    fillSoldermask(exposedCopper, copperRgb)
    const copperRelief = createBoardReliefTextures(asTexture(exposedCopper))

    const copperColoredMask = createCanvas(4, 4)
    fillSoldermask(copperColoredMask, copperRgb)
    const soldermaskCoverage = createCanvas(4, 4)
    fillSoldermask(soldermaskCoverage, [255, 255, 255])
    const maskRelief = createBoardReliefTextures(
      asTexture(copperColoredMask),
      null,
      asTexture(soldermaskCoverage),
    )

    expect(copperRelief).not.toBeNull()
    expect(maskRelief).not.toBeNull()

    const copperBump = copperRelief!.bumpMap.image as unknown as TestCanvas
    const maskBump = maskRelief!.bumpMap.image as unknown as TestCanvas
    const copperMetalness = copperRelief!.metalnessMap
      .image as unknown as TestCanvas
    const maskMetalness = maskRelief!.metalnessMap
      .image as unknown as TestCanvas

    expect(maskBump.channel(1, 1, 0)).toBeGreaterThan(
      copperBump.channel(1, 1, 0) + 100,
    )
    expect(maskMetalness.channel(1, 1, 0)).toBeLessThan(
      copperMetalness.channel(1, 1, 0) - 100,
    )
  })
})
