import { useState, useEffect, useRef } from "react"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { AnyCircuitElement } from "circuit-json"
import { createSimplifiedBoardGeom } from "../soup-to-3d"
import { BoardGeomBuilder } from "../BoardGeomBuilder"

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

    // Set initial simplified geometry
    const simplifiedGeom = createSimplifiedBoardGeom(circuitJson)
    setBoardGeom(simplifiedGeom)

    // Start the detailed builder
    const builder = new BoardGeomBuilder(circuitJson, (finalGeoms) => {}, {
      includeCopperPours: false,
    })

    const runBuilderSteps = async () => {
      if (isProcessingRef.current) return // Prevent concurrent runs
      isProcessingRef.current = true

      try {
        let isDone = false
        while (!isDone && !isCancelled) {
          isDone = builder.step(1) // Process one step
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
