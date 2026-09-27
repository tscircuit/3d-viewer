/**
 * `hole_with_polygon_pad` plated holes store `pad_outline` and the hole offset
 * relative to the hole position, unrotated; `ccw_rotation` (the component
 * rotation emitted by core) rotates both around the hole position.
 */
export const rotatePolygonPadPoint = (
  point: { x: number; y: number },
  ccwRotationDegrees: number | undefined,
): { x: number; y: number } => {
  const rotation = ((ccwRotationDegrees ?? 0) * Math.PI) / 180
  if (rotation === 0) return point
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }
}

export const getRotatedPolygonPadOutline = (
  padOutline: { x: number; y: number }[],
  ccwRotationDegrees: number | undefined,
): { x: number; y: number }[] =>
  padOutline.map((point) => rotatePolygonPadPoint(point, ccwRotationDegrees))
