import { useState, useEffect, useMemo } from "react"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { cuboid } from "@jscad/modeling/src/primitives"
import { colorize } from "@jscad/modeling/src/colors"
import { subtract, union } from "@jscad/modeling/src/operations/booleans"
import { translate } from "@jscad/modeling/src/operations/transforms"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { polygon } from "@jscad/modeling/src/primitives"
import type { Vec2 } from "@jscad/modeling/src/maths/types"
import { arePointsClockwise } from "../geoms/create-board-with-outline"
import {
  boardMaterialColors,
  colors as defaultColors,
} from "../geoms/constants"

export const usePanelGeomBuilderJscad = (
  circuitJson: AnyCircuitElement[] | undefined,
): Geom3[] | null => {
  const [panelGeom, setPanelGeom] = useState<Geom3[] | null>(null)

  const panelData = useMemo(() => {
    if (!circuitJson) return null
    const panels = circuitJson.filter((e) => e.type === "pcb_panel")
    if (panels.length === 0) return null
    return panels[0] as any
  }, [circuitJson])

  const boards = useMemo(() => {
    if (!circuitJson) return []
    return su(circuitJson).pcb_board.list()
  }, [circuitJson])

  useEffect(() => {
    if (!panelData || !circuitJson) {
      setPanelGeom(null)
      return
    }

    try {
      // Use board thickness for panel (same piece of material)
      const panelThickness = boards[0]?.thickness || 1.6

      // Create base panel
      let panelGeom3 = cuboid({
        size: [panelData.width, panelData.height, panelThickness],
        center: [panelData.center?.x || 0, panelData.center?.y || 0, 0],
      })

      // Create cutouts for each board
      const cutouts: Geom3[] = []
      const cutoutDepth = panelThickness * 1.5

      for (const board of boards) {
        let cutout: Geom3

        if (board.outline && board.outline.length >= 3) {
          // Polygon cutout
          let points: Vec2[] = board.outline.map((p) => [p.x, p.y])
          if (arePointsClockwise(points)) {
            points = points.reverse()
          }
          const polygon2d = polygon({ points })
          cutout = extrudeLinear({ height: cutoutDepth }, polygon2d)
          cutout = translate([0, 0, -cutoutDepth / 2], cutout)
          cutout = translate([board.center.x, board.center.y, 0], cutout)
        } else {
          // Rectangular cutout
          cutout = cuboid({
            size: [board.width!, board.height!, cutoutDepth],
            center: [board.center.x, board.center.y, 0],
          })
        }

        cutouts.push(cutout)
      }

      // Subtract all cutouts from panel
      if (cutouts.length > 0) {
        const unionedCutouts = union(cutouts)
        panelGeom3 = subtract(panelGeom3, unionedCutouts)
      }

      // Apply same material/color as boards
      const boardMaterial = boards[0]?.material || "fr4"
      const matColorArray =
        boardMaterialColors[boardMaterial] ?? defaultColors.fr4Green
      const coloredPanel = colorize(matColorArray, panelGeom3)

      setPanelGeom([coloredPanel])
    } catch (e: any) {
      console.error("Error creating JSCAD panel geometry:", e)
      setPanelGeom(null)
    }
  }, [panelData, boards, circuitJson])

  return panelGeom
}
