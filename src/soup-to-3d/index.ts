import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { AnySoupElement, PCBPlatedHole } from "@tscircuit/soup"
import { su } from "@tscircuit/soup-util"
import { scale, translate } from "@jscad/modeling/src/operations/transforms"
import {
  cube,
  sphere,
  rectangle,
  cuboid,
  cylinder,
  circle,
  line,
} from "@jscad/modeling/src/primitives"
import { colorize } from "@jscad/modeling/src/colors"
import { subtract, union } from "@jscad/modeling/src/operations/booleans"
import { platedHole } from "../geoms/plated-hole"
import { M, colors } from "../geoms/constants"
import {
  extrudeLinear,
  extrudeRectangular,
} from "@jscad/modeling/src/operations/extrusions"
import { expand } from "@jscad/modeling/src/operations/expansions"

function pairs<T>(arr: T[]): [T, T][] {
  const result: [T, T][] = []
  for (let i = 0; i < arr.length - 2; i++) {
    result.push([arr[i], arr[i + 1]])
  }
  return result
}

export const soupToJscadShape = (soup: AnySoupElement[]): Geom3[] => {
  const board = su(soup).pcb_board.list()[0]
  if (!board) {
    throw new Error("No pcb_board found")
  }

  const plated_holes = su(soup).pcb_plated_hole.list()
  const pads = su(soup).pcb_smtpad.list()
  const traces = su(soup).pcb_trace.list()

  // PCB Board
  let boardGeom = cuboid({ size: [board.width, board.height, 1.2] })

  const platedHoleGeoms: Geom3[] = []
  const padGeoms: Geom3[] = []
  const traceGeoms: Geom3[] = []
  const ctx = {
    pcbThickness: 1.2,
  }

  const addPlatedHole = (plated_hole: PCBPlatedHole) => {
    if (plated_hole.shape === "circle" || !plated_hole.shape) {
      const cyGeom = cylinder({
        center: [plated_hole.x, plated_hole.y, 0],
        radius: plated_hole.hole_diameter / 2 + M,
      })
      boardGeom = subtract(boardGeom, cyGeom)

      const platedHoleGeom = platedHole(plated_hole, ctx)
      platedHoleGeoms.push(platedHoleGeom)
    }
  }

  for (const plated_hole of plated_holes) {
    addPlatedHole(plated_hole)
  }

  for (const pad of pads) {
    if (pad.shape === "rect") {
      const padGeom = colorize(
        colors.copper,
        cuboid({
          center: [pad.x, pad.y, 1.2 / 2 + M],
          size: [pad.width, pad.height, M],
        })
      )
      padGeoms.push(padGeom)
    } else if (pad.shape === "circle") {
      const padGeom = colorize(
        colors.copper,
        cylinder({
          center: [pad.x, pad.y, 1.2 / 2 + M],
          radius: pad.radius,
          height: M,
        })
      )
      padGeoms.push(padGeom)
    }
  }

  for (const { route: mixedRoute } of traces) {
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
      }
    )
    for (const route of subRoutes.allPrev.concat([subRoutes.current])) {
      // TODO break into segments based on layers
      const linePath = line(route.map((p) => [p.x, p.y]))

      const layer = route[0].route_type === "wire" ? route[0].layer : "top"
      const layerSign = layer === "top" ? 1 : -1
      // traceGeoms.push(traceGeom)
      const traceGeom = colorize(
        colors.copper,
        translate(
          [0, 0, (layerSign * 1.2) / 2],
          extrudeLinear(
            { height: M * layerSign },
            expand({ delta: 0.1, corners: "edge" }, linePath)
          )
        )
      )

      traceGeoms.push(traceGeom)
    }
    for (const via of mixedRoute.filter((p) => p.route_type === "via")) {
      if (via.route_type !== "via") continue // TODO remove when ts is smart
      console.log(via)

      addPlatedHole({
        x: via.x,
        y: via.y,
        hole_diameter: 0.8,
        outer_diameter: 1.6,
        shape: "circle",
        layers: ["top", "bottom"],
        type: "pcb_plated_hole",
      })
    }
  }

  const pcb_vias = su(soup).pcb_via.list()

  for (const via of pcb_vias) {
    addPlatedHole({
      x: via.x,
      y: via.y,
      hole_diameter: via.hole_diameter,
      outer_diameter: via.outer_diameter,
      shape: "circle",
      layers: ["top", "bottom"],
      type: "pcb_plated_hole",
    })
  }

  // Colorize to a PCB green color: #05A32E
  boardGeom = colorize(colors.fr4Green, boardGeom)

  return [boardGeom, ...platedHoleGeoms, ...padGeoms, ...traceGeoms]
}
