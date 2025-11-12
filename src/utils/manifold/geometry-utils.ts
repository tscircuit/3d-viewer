/**
 * Determines if a set of 2D points are ordered clockwise.
 * Uses the shoelace formula to calculate signed area.
 */
export const arePointsClockwise = (
  points: Array<[number, number]>,
): boolean => {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    if (points[i] && points[j]) {
      area += points[i]![0] * points[j]![1]
      area -= points[j]![0] * points[i]![1]
    }
  }
  const signedArea = area / 2
  return signedArea <= 0
}
