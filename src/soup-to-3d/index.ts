import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { AnySoupElement, PCBPlatedHole } from "@tscircuit/soup"
import { su } from "@tscircuit/soup-util"
import { translate } from "@jscad/modeling/src/operations/transforms"
import { cuboid, cylinder, line } from "@jscad/modeling/src/primitives"
import { colorize } from "@jscad/modeling/src/colors"
import { subtract, union } from "@jscad/modeling/src/operations/booleans"
import { platedHole } from "../geoms/plated-hole"
import { M, colors } from "../geoms/constants"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { expand } from "@jscad/modeling/src/operations/expansions"
import { createBoardWithOutline } from "src/geoms/create-board-with-outline"

export const createBoardGeomFromSoup = (soup: AnySoupElement[]): Geom3[] => {
  const board = su(soup).pcb_board.list()[0]
  if (!board) {
    throw new Error("No pcb_board found")
  }
  const plated_holes = su(soup).pcb_plated_hole.list()
  const holes = su(soup).pcb_hole.list()
  const pads = su(soup).pcb_smtpad.list()
  const traces = su(soup).pcb_trace.list()
  const pcb_vias = su(soup).pcb_via.list()

  // PCB Board
  let boardGeom: Geom3
  if (board.outline && board.outline.length > 0)
    boardGeom = createBoardWithOutline(board.outline, 1.2)
  else boardGeom = cuboid({ size: [board.width, board.height, 1.2] })

  const platedHoleGeoms: Geom3[] = []
  const holeGeoms: Geom3[] = []
  const padGeoms: Geom3[] = []
  const traceGeoms: Geom3[] = []
  const ctx = {
    pcbThickness: 1.2,
  }

  const addPlatedHole = (plated_hole: PCBPlatedHole) => {
    if (plated_hole.shape === "circle") {
      const cyGeom = cylinder({
        center: [plated_hole.x, plated_hole.y, 0],
        radius: plated_hole.hole_diameter / 2 + M,
      })

      boardGeom = subtract(boardGeom, cyGeom)

      const platedHoleGeom = platedHole(plated_hole, ctx)
      platedHoleGeoms.push(platedHoleGeom)
    } else if (plated_hole.shape === "pill") {
      const shouldRotate = plated_hole.hole_height! > plated_hole.hole_width!

      const holeWidth = shouldRotate
        ? plated_hole.hole_height!
        : plated_hole.hole_width!
      const holeHeight = shouldRotate
        ? plated_hole.hole_width!
        : plated_hole.hole_height!

      const holeRadius = holeHeight / 2
      const rectLength = Math.abs(holeWidth - holeHeight)

      const pillHole = union(
        cuboid({
          center: [plated_hole.x, plated_hole.y, 0],
          size: shouldRotate
            ? [holeHeight, rectLength, 1.5]
            : [rectLength, holeHeight, 1.5],
        }),
        cylinder({
          center: shouldRotate
            ? [plated_hole.x, plated_hole.y - rectLength / 2, 0]
            : [plated_hole.x - rectLength / 2, plated_hole.y, 0],
          radius: holeRadius,
          height: 1.5,
        }),
        cylinder({
          center: shouldRotate
            ? [plated_hole.x, plated_hole.y + rectLength / 2, 0]
            : [plated_hole.x + rectLength / 2, plated_hole.y, 0],
          radius: holeRadius,
          height: 1.5,
        }),
      )
      boardGeom = subtract(boardGeom, pillHole)

      const platedHoleGeom = platedHole(plated_hole, ctx)
      platedHoleGeoms.push(platedHoleGeom)
    }
  }

  for (const plated_hole of plated_holes) {
    addPlatedHole(plated_hole)
  }

  for (const hole of holes) {
    // @ts-expect-error
    if (hole.hole_shape === "round" || hole.hole_shape === "circle") {
      const cyGeom = cylinder({
        center: [hole.x, hole.y, 0],
        radius: hole.hole_diameter / 2 + M,
      })
      boardGeom = subtract(boardGeom, cyGeom)
    }
  }

  for (const pad of pads) {
    const layerSign = pad.layer === "bottom" ? -1 : 1
    if (pad.shape === "rect") {
      const padGeom = colorize(
        colors.copper,
        cuboid({
          center: [pad.x, pad.y, (layerSign * 1.2) / 2 + layerSign * M],
          size: [pad.width, pad.height, M],
        }),
      )
      padGeoms.push(padGeom)
    } else if (pad.shape === "circle") {
      const padGeom = colorize(
        colors.copper,
        cylinder({
          center: [pad.x, pad.y, (layerSign * 1.2) / 2 + layerSign * M],
          radius: pad.radius,
          height: M,
        }),
      )
      padGeoms.push(padGeom)
    }
  }

  for (const { route: mixedRoute } of traces) {
    if (mixedRoute.length < 2) continue
    const subRoutes = mixedRoute.reduce(
      (c, p) => {
        // @ts-ignore
        const lastLayer = c.current?.[c.current.length - 1]?.layer
        if (
          p.route_type === "via" ||
          (p.route_type === "wire" && p.layer !== lastLayer)
        ) {
          if (c.current.length > 2) {
            c.allPrev.push(c.current)
          }
          c.current = p.route_type === "wire" ? [p] : []
          return c
        }
        c.current.push(p)
        return c
      },
      {
        current: [] as typeof mixedRoute,
        allPrev: [] as Array<typeof mixedRoute>,
      },
    )
    for (const route of subRoutes.allPrev.concat([subRoutes.current])) {
      // TODO break into segments based on layers
      const linePath = line(route.map((p) => [p.x, p.y]))

      const layer = route[0]!.route_type === "wire" ? route[0]!.layer : "top"
      const layerSign = layer === "top" ? 1 : -1
      // traceGeoms.push(traceGeom)
      let traceGeom = translate(
        [0, 0, (layerSign * 1.2) / 2],
        extrudeLinear(
          { height: M * layerSign },
          expand({ delta: 0.1, corners: "edge" }, linePath),
        ),
      )

      // HACK: Subtract all vias from every trace- this mostly is because the
      // vias aren't inside the route- we should probably pre-filter to make sure
      // that vias are only near the route
      for (const via of pcb_vias) {
        traceGeom = subtract(
          traceGeom,
          cylinder({
            center: [via.x, via.y, 0],
            radius: via.outer_diameter / 2,
            height: 5,
          }),
        )
      }
      for (const ph of plated_holes) {
        if (ph.shape === "circle") {
          traceGeom = subtract(
            traceGeom,
            cylinder({
              center: [ph.x, ph.y, 0],
              radius: ph.outer_diameter / 2,
              height: 5,
            }),
          )
        }
      }

      traceGeom = colorize(colors.fr4GreenSolderWithMask, traceGeom)

      traceGeoms.push(traceGeom)
    }
  }

  for (const via of pcb_vias) {
    addPlatedHole({
      x: via.x,
      y: via.y,
      hole_diameter: via.hole_diameter,
      outer_diameter: via.outer_diameter,
      shape: "circle",
      layers: ["top", "bottom"],
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "",
    })
  }

  // Colorize to a PCB green color: #05A32E
  boardGeom = colorize(colors.fr4Green, boardGeom)

  return [boardGeom, ...platedHoleGeoms, ...padGeoms, ...traceGeoms]
}
