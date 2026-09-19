export interface GeometryImage {
  width: number
  height: number
  data: Uint8Array | Uint8ClampedArray
}

export interface GeometryEdgeOptions {
  maxDistancePx?: number
  maxUnmatchedFraction?: number
}

function validateImage(image: GeometryImage, name: string) {
  if (
    !image ||
    !Number.isSafeInteger(image.width) ||
    !Number.isSafeInteger(image.height) ||
    image.width <= 0 ||
    image.height <= 0 ||
    !Number.isSafeInteger(image.width * image.height * 4)
  ) {
    throw new RangeError(`${name} must have positive integer RGBA dimensions`)
  }
  if (
    !(image.data instanceof Uint8Array) &&
    !(image.data instanceof Uint8ClampedArray)
  ) {
    throw new TypeError(`${name}.data must be an RGBA byte array`)
  }
  if (image.data.length !== image.width * image.height * 4) {
    throw new RangeError(`${name}.data length must equal width * height * 4`)
  }
}

function extractEdges({ width, height, data }: GeometryImage) {
  const foreground = new Uint8Array(width * height)
  const edges = new Uint8Array(width * height)
  let clipped = false
  let count = 0

  // Composite over black, then threshold neutral geometry at half intensity.
  // Black crease lines become holes, so their adjacent white pixels are edges too.
  for (let i = 0; i < foreground.length; i++) {
    const offset = i * 4
    const intensity =
      ((data[offset]! + data[offset + 1]! + data[offset + 2]!) *
        data[offset + 3]!) /
      (3 * 255)
    foreground[i] = intensity >= 128 ? 1 : 0
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (!foreground[i]) continue
      const atBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1
      if (
        atBorder ||
        !foreground[i - 1] ||
        !foreground[i + 1] ||
        !foreground[i - width] ||
        !foreground[i + width]
      ) {
        edges[i] = 1
        count++
      }
      if (atBorder) clipped = true
    }
  }
  return { edges, count, clipped }
}

function findUnmatched(
  source: Uint8Array,
  target: Uint8Array,
  width: number,
  height: number,
  tolerancePx: number,
) {
  // Two horizontal sweeps give the exact nearest target edge in each row.
  // For a source edge, inspect only rows within the tolerance disk; the nearest
  // horizontal edge in each row is sufficient for exact Euclidean coverage.
  // Cost: O(width * height + sourceEdges * min(height, 2 * tolerancePx + 1)).
  const horizontalDistance = new Float64Array(target.length)
  for (let y = 0; y < height; y++) {
    let distance = Infinity
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      distance = target[i] ? 0 : distance + 1
      horizontalDistance[i] = distance
    }
    distance = Infinity
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x
      distance = target[i] ? 0 : distance + 1
      horizontalDistance[i] = Math.min(horizontalDistance[i]!, distance)
    }
  }

  const unmatched = new Uint8Array(source.length)
  const radius = Math.min(height - 1, Math.floor(tolerancePx))
  // Precompute the horizontal reach of each row through the tolerance disk.
  const reach = new Float64Array(radius + 1)
  for (let dy = 0; dy <= radius; dy++) {
    reach[dy] = Math.sqrt(tolerancePx ** 2 - dy ** 2)
  }
  let count = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (!source[i]) continue
      let covered = false
      for (let dy = 0; dy <= radius && !covered; dy++) {
        for (const row of dy === 0 ? [y] : [y - dy, y + dy]) {
          if (row < 0 || row >= height) continue
          const distance = horizontalDistance[row * width + x]!
          if (Number.isFinite(distance) && distance <= reach[dy]!) {
            covered = true
            break
          }
        }
      }
      if (!covered) {
        unmatched[i] = 1
        count++
      }
    }
  }
  return { unmatched, count }
}

/**
 * Compare fixed-camera geometry passes without registration or pose correction.
 * Foreground uses a fixed 128/255 threshold and four-neighbor inner boundaries.
 * Coverage is many-to-one and independently bounded in both directions, not a
 * mean score. Subpixel/low-contrast features lost at threshold are not measured.
 *
 * Invalid input throws. Empty maps or foreground touching any image border
 * always mismatch, even when the requested unmatched fraction would allow it.
 * Empty maps report zero unmatched pixels/fraction, with an explicit reason.
 *
 * Diagnostics are opaque RGBA: edge maps are white on black; the overlay shows
 * covered edges gray, unmatched A red, and unmatched B cyan, at original pixels.
 */
export function compareGeometryEdges(
  a: GeometryImage,
  b: GeometryImage,
  options: GeometryEdgeOptions = {},
) {
  validateImage(a, "Image A")
  validateImage(b, "Image B")
  if (a.width !== b.width || a.height !== b.height) {
    throw new RangeError("Geometry image dimensions must match")
  }
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Geometry edge options must be an object")
  }
  const tolerancePx =
    options.maxDistancePx === undefined ? 1.5 : options.maxDistancePx
  const maxUnmatchedFraction =
    options.maxUnmatchedFraction === undefined
      ? 0.01
      : options.maxUnmatchedFraction
  if (!Number.isFinite(tolerancePx) || tolerancePx < 0) {
    throw new RangeError("maxDistancePx must be finite and nonnegative")
  }
  if (
    !Number.isFinite(maxUnmatchedFraction) ||
    maxUnmatchedFraction < 0 ||
    maxUnmatchedFraction > 1
  ) {
    throw new RangeError(
      "maxUnmatchedFraction must be finite and between 0 and 1",
    )
  }

  const edgeA = extractEdges(a)
  const edgeB = extractEdges(b)
  const unmatchedA = findUnmatched(
    edgeA.edges,
    edgeB.edges,
    a.width,
    a.height,
    tolerancePx,
  )
  const unmatchedB = findUnmatched(
    edgeB.edges,
    edgeA.edges,
    a.width,
    a.height,
    tolerancePx,
  )
  const unmatchedFractionA = edgeA.count ? unmatchedA.count / edgeA.count : 0
  const unmatchedFractionB = edgeB.count ? unmatchedB.count / edgeB.count : 0
  const reasons: string[] = []
  if (!edgeA.count) reasons.push("Image A has no geometry edges")
  if (!edgeB.count) reasons.push("Image B has no geometry edges")
  if (edgeA.clipped) reasons.push("Image A geometry touches the image border")
  if (edgeB.clipped) reasons.push("Image B geometry touches the image border")
  if (unmatchedFractionA > maxUnmatchedFraction) {
    reasons.push("Image A unmatched edge fraction exceeds maxUnmatchedFraction")
  }
  if (unmatchedFractionB > maxUnmatchedFraction) {
    reasons.push("Image B unmatched edge fraction exceeds maxUnmatchedFraction")
  }

  const edgeImageA = new Uint8ClampedArray(a.data.length)
  const edgeImageB = new Uint8ClampedArray(a.data.length)
  const overlay = new Uint8ClampedArray(a.data.length)
  for (let i = 0; i < edgeA.edges.length; i++) {
    const offset = i * 4
    edgeImageA.fill(edgeA.edges[i] ? 255 : 0, offset, offset + 3)
    edgeImageB.fill(edgeB.edges[i] ? 255 : 0, offset, offset + 3)
    edgeImageA[offset + 3] = 255
    edgeImageB[offset + 3] = 255
    overlay[offset + 3] = 255
    if (unmatchedA.unmatched[i]) {
      overlay.set([255, 64, 64], offset)
    } else if (unmatchedB.unmatched[i]) {
      overlay.set([0, 200, 255], offset)
    } else if (edgeA.edges[i] || edgeB.edges[i]) {
      overlay.fill(160, offset, offset + 3)
    }
  }

  return {
    matches: reasons.length === 0,
    reason: reasons.length ? reasons.join("; ") : undefined,
    tolerancePx,
    maxUnmatchedFraction,
    edgeCountA: edgeA.count,
    edgeCountB: edgeB.count,
    unmatchedA: unmatchedA.count,
    unmatchedB: unmatchedB.count,
    unmatchedFractionA,
    unmatchedFractionB,
    edgeImageA,
    edgeImageB,
    overlay,
  }
}
