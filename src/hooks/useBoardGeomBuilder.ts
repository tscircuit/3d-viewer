import { useState, useEffect, useRef } from "react"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { AnyCircuitElement } from "circuit-json"
import { createSimplifiedBoardGeom } from "../soup-to-3d"
import { BoardGeomBuilder } from "../BoardGeomBuilder"

export const useBoardGeomBuilder = (
  circuitJson: AnyCircuitElement[] | undefined,
): Geom3[] | null => {
  const [boardGeom, setBoardGeom] = useState<Geom3[] | null>(null)
  // Use ReturnType<typeof setInterval> to correctly type the interval ID
  const builderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!circuitJson) {
      setBoardGeom(null)
      return
    }
    if (!circuitJson.some((e) => e.type === "pcb_board")) {
      setBoardGeom(null)
      return
    }

    // Clear any previous interval
    if (builderIntervalRef.current) {
      clearInterval(builderIntervalRef.current)
      builderIntervalRef.current = null
    }

    // Set initial simplified geometry
    const simplifiedGeom = createSimplifiedBoardGeom(circuitJson)
    setBoardGeom(simplifiedGeom)

    // Start the detailed builder
    const builder = new BoardGeomBuilder(circuitJson, (finalGeoms) => {
      // Completion callback
      setBoardGeom(finalGeoms)
      if (builderIntervalRef.current) {
        clearInterval(builderIntervalRef.current)
        builderIntervalRef.current = null
      }
    })

    // Run builder incrementally
    builderIntervalRef.current = setInterval(() => {
      const isDone = builder.step(1)
      if (isDone && builderIntervalRef.current) {
        clearInterval(builderIntervalRef.current)
        builderIntervalRef.current = null
        // Ensure final state is set even if callback didn't fire somehow
        // Check if the current state is different from the final builder state
        setBoardGeom((currentGeom) => {
          const finalGeoms = builder.getGeoms()
          // Avoid unnecessary state updates if the geometry is already the final one
          // This comparison might need refinement depending on how Geom3 equality is defined
          if (JSON.stringify(currentGeom) !== JSON.stringify(finalGeoms)) {
            return finalGeoms
          }
          return currentGeom
        })
      }
    }, 10)

    // Cleanup function
    return () => {
      if (builderIntervalRef.current) {
        clearInterval(builderIntervalRef.current)
        builderIntervalRef.current = null
      }
    }
  }, [circuitJson]) // Rerun if circuitJson changes

  return boardGeom
}
