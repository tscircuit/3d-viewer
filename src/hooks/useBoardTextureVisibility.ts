import { useMemo } from "react"
import type { LayerVisibilityState } from "../contexts/LayerVisibilityContext"

// Only layer flags read by createCombinedBoardTextures invalidate its cache.
// CAD/enclosure visibility must not regenerate the PCB canvases and relief maps.
export const useBoardTextureVisibility = (visibility: LayerVisibilityState) => {
  const {
    boardBody,
    topCopper,
    bottomCopper,
    topSilkscreen,
    bottomSilkscreen,
    topMask,
    bottomMask,
    keepout,
    pcbNotes,
  } = visibility
  return useMemo(
    () => ({
      boardBody,
      topCopper,
      bottomCopper,
      topSilkscreen,
      bottomSilkscreen,
      topMask,
      bottomMask,
      keepout,
      pcbNotes,
    }),
    [
      boardBody,
      topCopper,
      bottomCopper,
      topSilkscreen,
      bottomSilkscreen,
      topMask,
      bottomMask,
      keepout,
      pcbNotes,
    ],
  )
}
