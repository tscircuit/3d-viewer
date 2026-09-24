import { expect, test } from "bun:test"
import * as THREE from "three"
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
  color: [number, number, number, number] = [20, 110, 55, 255],
) => {
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      // This bright green used to trigger the g > 88 masked-copper heuristic.
      canvas.setPixel(x, y, color)
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

test("soldermask colors preserve masked-copper relief", () => {
  withCanvasDocument(() => {
    const soldermaskOverCopperColors = [
      [119, 60, 34, 255],
      [42, 70, 124, 255],
      [86, 45, 105, 255],
      [22, 23, 22, 255],
      [218, 215, 211, 255],
      [218, 197, 76, 255],
    ] as const

    for (const soldermaskColor of soldermaskOverCopperColors) {
      const board = createCanvas(4, 4)
      fillSoldermask(board, [...soldermaskColor])
      const traceMask = createCanvas(4, 4)
      traceMask.setPixel(2, 2, [255, 255, 255, 255])
      const relief = createBoardReliefTextures(
        asTexture(board),
        asTexture(traceMask),
      )
      const bump = relief!.bumpMap.image as TestCanvas
      expect(bump.channel(2, 2, 0)).toBeLessThan(100)
    }

    const yellowBoard = createCanvas(4, 4)
    fillSoldermask(yellowBoard, [220, 200, 74, 255])
    const yellowRelief = createBoardReliefTextures(asTexture(yellowBoard))
    const yellowBump = yellowRelief!.bumpMap.image as TestCanvas
    expect(yellowBump.channel(0, 0, 0)).toBeGreaterThan(170)

    const yellowOverCopperBoard = createCanvas(4, 4)
    fillSoldermask(yellowOverCopperBoard, [218, 197, 76, 255])
    const yellowOverCopperRelief = createBoardReliefTextures(
      asTexture(yellowOverCopperBoard),
    )
    const yellowOverCopperBump = yellowOverCopperRelief!.bumpMap
      .image as TestCanvas
    expect(yellowOverCopperBump.channel(0, 0, 0)).toBeGreaterThan(170)
  })
})

test("relief maps preserve mixed surfaces, transparency, and normal-map edges", () => {
  withCanvasDocument(() => {
    const board = createCanvas(8, 6)
    const mask = createCanvas(4, 3)
    const colors: [number, number, number, number][] = [
      [20, 110, 55, 255],
      [210, 160, 60, 255],
      [240, 240, 230, 255],
      [220, 200, 74, 255],
      [20, 20, 20, 255],
      [0, 0, 0, 0],
    ]
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 8; x++)
        board.setPixel(x, y, colors[(x + y) % colors.length]!)
    }
    mask.setPixel(1, 1, [255, 255, 255, 255])
    mask.setPixel(3, 2, [255, 255, 255, 255])
    const relief = createBoardReliefTextures(asTexture(board), asTexture(mask))!
    const hashes = Object.fromEntries(
      Object.entries(relief).map(([name, texture]) => [
        name,
        new Bun.CryptoHasher("sha256")
          .update((texture.image as TestCanvas).snapshot())
          .digest("hex"),
      ]),
    )
    expect(hashes).toMatchSnapshot()
  })
})
