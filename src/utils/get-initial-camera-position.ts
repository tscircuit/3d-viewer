type BoardDimensions = {
  width?: number
  height?: number
}

type BoardCenter = {
  x: number
  y: number
}

export function getInitialCameraPosition({
  boardDimensions,
  boardCenter,
}: {
  boardDimensions?: BoardDimensions
  boardCenter?: BoardCenter
}): readonly [number, number, number] {
  if (!boardDimensions || !boardCenter) return [5, -5, 5]

  const safeWidth = Math.max(boardDimensions.width ?? 0, 1)
  const safeHeight = Math.max(boardDimensions.height ?? 0, 1)
  const largestDimension = Math.max(safeWidth, safeHeight, 5)

  // Camera and board positions share board-world millimeter coordinates.
  return [
    boardCenter.x + largestDimension * 0.4,
    boardCenter.y - largestDimension * 0.7,
    largestDimension * 0.9,
  ]
}
