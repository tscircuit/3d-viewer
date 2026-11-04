import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { AnyCircuitElement } from "circuit-json"
import { useEffect, useRef, useState } from "react"
import { BoardGeomBuilder } from "../BoardGeomBuilder"
import { createSimplifiedBoardGeom } from "../soup-to-3d"

const STEP_BATCH_SIZE = 16
const MAX_FRAME_BUDGET_MS = 12

export const useBoardGeomBuilder = (
  circuitJson: AnyCircuitElement[] | undefined,
): Geom3[] | null => {
  const [boardGeom, setBoardGeom] = useState<Geom3[] | null>(null)
  const isProcessingRef = useRef(false) // To track if processing is ongoing

  useEffect(() => {
    let isCancelled = false // Flag to signal cancellation

    if (!circuitJson) {
      setBoardGeom(null)
      return
    }
    // Check for either pcb_board or pcb_panel
    const hasBoardOrPanel = circuitJson.some(
      (e) => e.type === "pcb_board" || e.type === "pcb_panel",
    )
    if (!hasBoardOrPanel) {
      setBoardGeom(null)
      return
    }

    // Set initial simplified geometry (includes board outline + cutouts immediately)
    const simplifiedGeom = createSimplifiedBoardGeom(circuitJson)
    setBoardGeom(simplifiedGeom)

    // Start the detailed builder
    const builder = new BoardGeomBuilder(circuitJson, (finalGeoms) => {})

    const runBuilderSteps = async () => {
      if (isProcessingRef.current) return // Prevent concurrent runs
      isProcessingRef.current = true

      try {
        let isDone = false
        while (!isDone && !isCancelled) {
          const frameStart =
            typeof performance !== "undefined" ? performance.now() : Date.now()
          while (!isDone && !isCancelled) {
            isDone = builder.step(STEP_BATCH_SIZE)
            const now =
              typeof performance !== "undefined"
                ? performance.now()
                : Date.now()
            if (now - frameStart >= MAX_FRAME_BUDGET_MS) {
              break
            }
          }
          if (!isDone) {
            // Yield to the event loop to allow UI updates and prevent blocking
            await new Promise((resolve) => setTimeout(resolve, 0))
          }
        }

        if (!isCancelled) {
          // Ensure final state is set
          setBoardGeom(builder.getGeoms())
        }
      } catch (error) {
        console.error("Error during board geometry building:", error)
        // Optionally set an error state here
      } finally {
        isProcessingRef.current = false
      }
    }

    runBuilderSteps()

    // Cleanup function
    return () => {
      isCancelled = true // Signal cancellation to the async loop
    }
  }, [circuitJson]) // Rerun if circuitJson changes

  return boardGeom
}
