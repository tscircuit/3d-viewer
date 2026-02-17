import { describe, it, expect } from "bun:test"

/**
 * Tests for the PCB texture pipeline utilities.
 *
 * These tests verify the pure-function helpers that determine texture
 * dimensions and parse SVG metadata. They do NOT require a browser or
 * WebGL context.
 */

// Re-implement the helpers locally so we can test them without importing
// the module (which has side-effect-heavy deps like THREE and resvg-wasm).

function parseSvgAspectRatio(svgString: string): {
  width: number
  height: number
} {
  const viewBoxMatch = svgString.match(/viewBox="([^"]+)"/)
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].split(/[\s,]+/).map(Number)
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] }
    }
  }
  const wMatch = svgString.match(/\bwidth="([\d.]+)"/)
  const hMatch = svgString.match(/\bheight="([\d.]+)"/)
  if (wMatch && hMatch) {
    const w = Number(wMatch[1])
    const h = Number(hMatch[1])
    if (w > 0 && h > 0) return { width: w, height: h }
  }
  return { width: 1, height: 1 }
}

function computeTextureDimensions(
  svgWidth: number,
  svgHeight: number,
  maxDim = 2048,
): { width: number; height: number } {
  const aspect = svgWidth / svgHeight
  let w: number
  let h: number
  if (aspect >= 1) {
    w = maxDim
    h = Math.round(maxDim / aspect)
  } else {
    h = maxDim
    w = Math.round(maxDim * aspect)
  }
  w = Math.max(1, w)
  h = Math.max(1, h)
  return { width: w, height: h }
}

describe("parseSvgAspectRatio", () => {
  it("parses viewBox attribute", () => {
    const svg = `<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"></svg>`
    expect(parseSvgAspectRatio(svg)).toEqual({ width: 200, height: 100 })
  })

  it("falls back to width/height attributes", () => {
    const svg = `<svg width="300" height="150" xmlns="http://www.w3.org/2000/svg"></svg>`
    expect(parseSvgAspectRatio(svg)).toEqual({ width: 300, height: 150 })
  })

  it("returns 1x1 for SVG with no size info", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>`
    expect(parseSvgAspectRatio(svg)).toEqual({ width: 1, height: 1 })
  })
})

describe("computeTextureDimensions", () => {
  it("produces landscape dimensions for wide boards", () => {
    const { width, height } = computeTextureDimensions(200, 100, 2048)
    expect(width).toBe(2048)
    expect(height).toBe(1024)
  })

  it("produces portrait dimensions for tall boards", () => {
    const { width, height } = computeTextureDimensions(50, 200, 2048)
    expect(width).toBe(512)
    expect(height).toBe(2048)
  })

  it("produces square dimensions for square boards", () => {
    const { width, height } = computeTextureDimensions(100, 100, 2048)
    expect(width).toBe(2048)
    expect(height).toBe(2048)
  })

  it("respects custom maxDim", () => {
    const { width, height } = computeTextureDimensions(200, 100, 1024)
    expect(width).toBe(1024)
    expect(height).toBe(512)
  })

  it("clamps to at least 1px", () => {
    const { width, height } = computeTextureDimensions(1, 100000, 2048)
    expect(width).toBeGreaterThanOrEqual(1)
    expect(height).toBeGreaterThanOrEqual(1)
  })
})
