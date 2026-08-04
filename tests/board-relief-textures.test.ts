import { expect, test } from "bun:test"
import * as THREE from "three"
import { PAD_COPPER_TEXTURE_MATERIAL } from "../src/board-surface-textures"
import { createBoardReliefTextures } from "../src/utils/create-board-relief-textures"

type PixelImage = {
  data: Uint8ClampedArray
  width: number
  height: number
}

class TestCanvas {
  private pixels: Uint8ClampedArray

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.pixels = new Uint8ClampedArray(width * height * 4)
  }

  setPixel(rgba: [number, number, number, number]) {
    this.pixels.set(rgba)
  }

  channel(channel: number) {
    return this.pixels[channel] ?? 0
  }

  getContext() {
    return {
      getImageData: () => ({
        data: this.pixels.slice(),
        width: this.width,
        height: this.height,
      }),
      createImageData: (width: number, height: number) =>
        ({
          data: new Uint8ClampedArray(width * height * 4),
          width,
          height,
        }) satisfies PixelImage,
      putImageData: (image: PixelImage) => {
        this.pixels.set(image.data)
      },
    }
  }
}

test("ENIG pixels use the configured copper roughness and metalness", () => {
  const source = new TestCanvas(1, 1)
  source.setPixel([199, 161, 99, 255])
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: {
      createElement: () => new TestCanvas(1, 1),
    },
  })

  try {
    const relief = createBoardReliefTextures(
      new THREE.CanvasTexture(source as unknown as HTMLCanvasElement),
    )
    expect(relief).not.toBeNull()
    expect(PAD_COPPER_TEXTURE_MATERIAL.roughness).toBe(0.42)
    expect(PAD_COPPER_TEXTURE_MATERIAL.metalness).toBe(0.5)

    const metalness = relief!.metalnessMap.image as unknown as TestCanvas
    expect(metalness.channel(0)).toBe(128)
  } finally {
    Object.assign(globalThis, { document: previousDocument })
  }
})

test("masked traces share the solder-mask surface finish", () => {
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: {
      createElement: () => new TestCanvas(1, 1),
    },
  })

  try {
    const createRelief = (color: [number, number, number, number]) => {
      const source = new TestCanvas(1, 1)
      source.setPixel(color)
      return createBoardReliefTextures(
        new THREE.CanvasTexture(source as unknown as HTMLCanvasElement),
      )!
    }
    const solderMask = createRelief([15, 79, 48, 255])
    const copperUnderMask = createRelief([23, 97, 59, 255])

    for (const map of ["bumpMap", "roughnessMap", "metalnessMap"] as const) {
      const boardChannel = (
        solderMask[map].image as unknown as TestCanvas
      ).channel(0)
      const traceChannel = (
        copperUnderMask[map].image as unknown as TestCanvas
      ).channel(0)
      expect(traceChannel).toBe(boardChannel)
    }
  } finally {
    Object.assign(globalThis, { document: previousDocument })
  }
})
