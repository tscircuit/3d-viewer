import { colors as defaultColors } from "../../geoms/constants"

/**
 * Get copper color based on soldermask coverage
 */
export function getCopperColor(coveredWithSolderMask: boolean): string {
  const colorArr = coveredWithSolderMask
    ? defaultColors.fr4TracesWithMaskGreen
    : defaultColors.copper

  return `rgb(${colorArr[0] * 255}, ${colorArr[1] * 255}, ${colorArr[2] * 255})`
}

/**
 * Get copper colors for circuit-to-canvas configuration
 */
export function getCircuitToCanvasColors() {
  const coveredColor = `rgb(${defaultColors.fr4TracesWithMaskGreen.map((c) => c * 255).join(",")})`
  const uncoveredColor = `rgb(${defaultColors.copper.map((c) => c * 255).join(",")})`

  return {
    covered: {
      copper: {
        top: coveredColor,
        bottom: coveredColor,
        inner1: coveredColor,
        inner2: coveredColor,
        inner3: coveredColor,
        inner4: coveredColor,
        inner5: coveredColor,
        inner6: coveredColor,
      },
    },
    uncovered: {
      copper: {
        top: uncoveredColor,
        bottom: uncoveredColor,
        inner1: uncoveredColor,
        inner2: uncoveredColor,
        inner3: uncoveredColor,
        inner4: uncoveredColor,
        inner5: uncoveredColor,
        inner6: uncoveredColor,
      },
    },
  }
}
