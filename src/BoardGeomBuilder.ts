import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type {
  AnyCircuitElement,
  PcbPlatedHole,
  PcbBoard,
  PcbHole,
  PcbSmtPad,
  PcbTrace,
  PcbVia,
  PcbCutout,
  PcbCopperPour,
  PcbPanel,
} from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { translate, rotateZ } from "@jscad/modeling/src/operations/transforms"
import {
  cuboid,
  cylinder,
  line,
  polygon as jscadPolygon,
  roundedRectangle,
  ellipse,
} from "@jscad/modeling/src/primitives"
import { colorize } from "@jscad/modeling/src/colors"
import {
  subtract,
  union,
  intersect,
} from "@jscad/modeling/src/operations/booleans"
import { platedHole } from "./geoms/plated-hole"
import {
  M,
  colors,
  boardMaterialColors,
  tracesMaterialColors,
  BOARD_SURFACE_OFFSET,
} from "./geoms/constants"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { expand } from "@jscad/modeling/src/operations/expansions"
import {
  createBoardGeomWithOutline,
  arePointsClockwise,
} from "./geoms/create-board-with-outline"
import type { Vec2 } from "@jscad/modeling/src/maths/types"

import { createGeom2FromBRep } from "./geoms/brep-converter"
import type { GeomContext } from "./GeomContext"
import {
  clampRectBorderRadius,
  extractRectBorderRadius,
} from "./utils/rect-border-radius"
import { createHoleWithPolygonPadHoleGeom } from "./geoms/create-hole-with-polygon-pad"
import { createViaCopper, createViaBoardDrill } from "./geoms/via-geoms"

const PAD_ROUNDED_SEGMENTS = 64
const BOARD_CLIP_Z_MARGIN = 1
const BOARD_CLIP_XY_OUTSET = 0.05

const createCenteredRectPadGeom = (
  width: number,
  height: number,
  thickness: number,
  rectBorderRadius?: number | null,
) => {
  const clampedRadius = clampRectBorderRadius(width, height, rectBorderRadius)

  if (clampedRadius <= 0) {
    return cuboid({ center: [0, 0, 0], size: [width, height, thickness] })
  }

  const rect2d = roundedRectangle({
    size: [width, height],
    roundRadius: clampedRadius,
    segments: PAD_ROUNDED_SEGMENTS,
  })
  const extruded = extrudeLinear({ height: thickness }, rect2d)
  return translate([0, 0, -thickness / 2], extruded)
}

type BuilderState =
  | "initializing"
  | "processing_pads"
  | "processing_copper_pours"
  | "processing_plated_holes"
  | "processing_holes"
  | "processing_cutouts"
  | "processing_vias"
  | "finalizing"
  | "done"

const buildStateOrder: BuilderState[] = [
  "initializing",
  "processing_pads",
  "processing_copper_pours",

  "processing_plated_holes",
  "processing_holes",
  "processing_cutouts",

  "processing_vias",
  "finalizing",
  "done",
]

export class BoardGeomBuilder {
  private circuitJson: AnyCircuitElement[]
  private board: PcbBoard
  private plated_holes: PcbPlatedHole[]
  private holes: PcbHole[]
  private pads: PcbSmtPad[]
  private traces: PcbTrace[]
  private pcb_vias: PcbVia[]
  private pcb_cutouts: PcbCutout[]

  private boardGeom: Geom3 | null = null
  private platedHoleGeoms: Geom3[] = []
  private padGeoms: Geom3[] = []
  private viaGeoms: Geom3[] = [] // Combined with platedHoleGeoms
  private copperPourGeoms: Geom3[] = []
  private boardClipGeom: Geom3 | null = null

  private state: BuilderState = "initializing"
  private currentIndex = 0
  private ctx: GeomContext
  private onCompleteCallback?: (geoms: Geom3[]) => void
  private finalGeoms: Geom3[] = []

  private getHoleToCut(x: number, y: number): { diameter: number } | null {
    const epsilon = M / 10
    for (const via of this.pcb_vias) {
      if (
        Math.abs(via.x - x) < epsilon &&
        Math.abs(via.y - y) < epsilon &&
        via.hole_diameter
      ) {
        return { diameter: via.hole_diameter }
      }
    }
    for (const ph of this.plated_holes) {
      if (ph.shape !== "circle") continue
      if (
        Math.abs(ph.x - x) < epsilon &&
        Math.abs(ph.y - y) < epsilon &&
        ph.hole_diameter
      ) {
        return { diameter: ph.hole_diameter }
      }
    }
    return null
  }

  constructor(
    circuitJson: AnyCircuitElement[],
    onComplete: (geoms: Geom3[]) => void,
  ) {
    this.circuitJson = circuitJson
    this.onCompleteCallback = onComplete

    // Extract elements - check for panel first, then board
    const panels = circuitJson.filter(
      (e) => e.type === "pcb_panel",
    ) as PcbPanel[]
    const boards = su(circuitJson).pcb_board.list()

    // If we have a panel, use it as the board outline
    if (panels.length > 0) {
      const panel = panels[0]!
      const firstBoardInPanel = boards.find(
        (b) => b.pcb_panel_id === panel.pcb_panel_id,
      )
      // Create a board-like object from the panel
      this.board = {
        type: "pcb_board",
        pcb_board_id: panel.pcb_panel_id,
        center: panel.center,
        width: panel.width,
        height: panel.height,
        thickness: firstBoardInPanel?.thickness ?? 1.4,
        material: firstBoardInPanel?.material ?? "fr4",
        num_layers: firstBoardInPanel?.num_layers ?? 2,
      } as PcbBoard
    } else {
      // Skip boards that are inside a panel - only render the panel outline
      const boardsNotInPanel = boards.filter((b) => !b.pcb_panel_id)
      this.board = boardsNotInPanel[0]!
    }

    this.plated_holes = su(circuitJson).pcb_plated_hole.list()
    this.holes = su(circuitJson).pcb_hole.list()
    this.pads = su(circuitJson).pcb_smtpad.list()
    this.traces = su(circuitJson).pcb_trace.list()
    this.pcb_vias = su(circuitJson).pcb_via.list()
    this.pcb_cutouts = su(circuitJson).pcb_cutout.list()

    this.ctx = { pcbThickness: this.board.thickness ?? 1.2 }

    // Start processing
    this.initializeBoard()
  }

  private initializeBoard() {
    const clipDepth = this.ctx.pcbThickness + 2 * BOARD_CLIP_Z_MARGIN

    if (this.board.outline && this.board.outline.length > 0) {
      this.boardGeom = createBoardGeomWithOutline(
        {
          outline: this.board.outline!,
        },
        this.ctx.pcbThickness,
      )
      this.boardClipGeom = createBoardGeomWithOutline(
        {
          outline: this.board.outline!,
        },
        clipDepth,
        { xyOutset: BOARD_CLIP_XY_OUTSET },
      )
    } else {
      this.boardGeom = cuboid({
        size: [this.board.width!, this.board.height!, this.ctx.pcbThickness],
        center: [this.board.center.x, this.board.center.y, 0],
      })
      this.boardClipGeom = cuboid({
        size: [
          this.board.width! + 2 * BOARD_CLIP_XY_OUTSET,
          this.board.height! + 2 * BOARD_CLIP_XY_OUTSET,
          clipDepth,
        ],
        center: [this.board.center.x, this.board.center.y, 0],
      })
    }
    this.state = "processing_pads"
    this.currentIndex = 0
  }

  goToNextState() {
    const currentIndex = buildStateOrder.indexOf(this.state)
    if (currentIndex === -1) return
    this.state = buildStateOrder[currentIndex + 1]!
    this.currentIndex = 0
  }

  // Performs a chunk of work. Returns true if finished.
  step(iterations = 1): boolean {
    if (this.state === "done" || !this.boardGeom) return true

    for (let i = 0; i < iterations; i++) {
      if (this.state === "done") break

      switch (this.state) {
        case "processing_plated_holes":
          if (this.currentIndex < this.plated_holes.length) {
            this.processPlatedHole(this.plated_holes[this.currentIndex]!)
            this.currentIndex++
          } else {
            this.goToNextState()
          }
          break

        case "processing_holes":
          if (this.currentIndex < this.holes.length) {
            this.processHole(this.holes[this.currentIndex]!)
            this.currentIndex++
          } else {
            this.goToNextState()
          }
          break

        case "processing_pads":
          if (this.currentIndex < this.pads.length) {
            this.processPad(this.pads[this.currentIndex]!)
            this.currentIndex++
          } else {
            this.goToNextState()
          }
          break
        case "processing_copper_pours":
          // Copper pours are rendered as textures in the JSCAD viewer.
          this.goToNextState()
          break

        case "processing_vias":
          if (this.currentIndex < this.pcb_vias.length) {
            this.processVia(this.pcb_vias[this.currentIndex]!)
            this.currentIndex++
          } else {
            this.goToNextState()
          }
          break

        case "processing_cutouts":
          if (this.currentIndex < this.pcb_cutouts.length) {
            this.processCutout(this.pcb_cutouts[this.currentIndex]!)
            this.currentIndex++
          } else {
            this.goToNextState()
          }
          break

        case "finalizing":
          this.finalize()
          this.state = "done"
          break
      }
    }

    return this.state === "done"
  }

  private processCutout(cutout: PcbCutout) {
    if (!this.boardGeom) return

    let cutoutGeom: Geom3 | null = null
    const cutoutHeight = this.ctx.pcbThickness * 1.5

    switch (cutout.shape) {
      case "rect": {
        const rectCornerRadius = clampRectBorderRadius(
          cutout.width,
          cutout.height,
          extractRectBorderRadius(cutout),
        )

        if (rectCornerRadius > 0) {
          const rect2d = roundedRectangle({
            size: [cutout.width, cutout.height],
            roundRadius: rectCornerRadius,
            segments: PAD_ROUNDED_SEGMENTS,
          })
          cutoutGeom = extrudeLinear({ height: cutoutHeight }, rect2d)
          cutoutGeom = translate([0, 0, -cutoutHeight / 2], cutoutGeom)
        } else {
          cutoutGeom = cuboid({
            center: [0, 0, 0],
            size: [cutout.width, cutout.height, cutoutHeight],
          })
        }
        // Apply rotation before translation (rotate around origin)
        if (cutout.rotation) {
          const rotationRadians = (cutout.rotation * Math.PI) / 180
          cutoutGeom = rotateZ(rotationRadians, cutoutGeom)
        }
        // Translate to final position after rotation
        cutoutGeom = translate(
          [cutout.center.x, cutout.center.y, 0],
          cutoutGeom,
        )
        break
      }
      case "circle":
        cutoutGeom = cylinder({
          center: [cutout.center.x, cutout.center.y, 0],
          radius: cutout.radius,
          height: cutoutHeight,
        })
        break
      case "polygon": {
        let pointsVec2: Vec2[] = cutout.points.map((p) => [p.x, p.y])
        if (pointsVec2.length < 3) {
          console.warn(
            `PCB Cutout [${cutout.pcb_cutout_id}] polygon has fewer than 3 points, skipping.`,
          )
          break
        }
        if (arePointsClockwise(pointsVec2)) {
          pointsVec2 = pointsVec2.reverse()
        }
        const polygon2d = jscadPolygon({ points: pointsVec2 })
        cutoutGeom = extrudeLinear({ height: cutoutHeight }, polygon2d)
        cutoutGeom = translate([0, 0, -cutoutHeight / 2], cutoutGeom)
        break
      }
    }

    if (cutoutGeom) {
      this.boardGeom = subtract(this.boardGeom, cutoutGeom)
    }
  }

  private processPlatedHole(
    ph: PcbPlatedHole,
    opts: { dontCutBoard?: boolean } = {},
  ) {
    if (!this.boardGeom) return

    if (ph.shape === "circle" || ph.shape === "circular_hole_with_rect_pad") {
      let cyGeom: Geom3 | null = null

      if (ph.shape === "circular_hole_with_rect_pad") {
        if (
          (ph.hole_shape && ph.hole_shape !== "circle") ||
          (ph.pad_shape && ph.pad_shape !== "rect")
        ) {
          return
        }
        cyGeom = cylinder({
          center: [
            ph.x + (ph.hole_offset_x || 0),
            ph.y + (ph.hole_offset_y || 0),
            0,
          ],
          radius: ph.hole_diameter / 2 + M, // Add margin for subtraction
          height: this.ctx.pcbThickness * 1.5, // Ensure it cuts through
        })
      } else {
        cyGeom = cylinder({
          center: [ph.x, ph.y, 0],
          radius: ph.hole_diameter / 2 + M, // Add margin for subtraction
          height: this.ctx.pcbThickness * 1.5, // Ensure it cuts through
        })
      }

      if (!opts.dontCutBoard) {
        this.boardGeom = subtract(this.boardGeom, cyGeom)
      }
      this.padGeoms = this.padGeoms.map((pg) =>
        colorize(colors.copper, subtract(pg, cyGeom)),
      )

      const platedHoleGeom = platedHole(ph, this.ctx, {
        clipGeom: this.boardClipGeom,
      })
      this.platedHoleGeoms.push(platedHoleGeom)
    } else if (ph.shape === "pill" || ph.shape === "oval") {
      const shouldRotate = ph.hole_height! > ph.hole_width!
      const holeWidth = shouldRotate ? ph.hole_height! : ph.hole_width!
      const holeHeight = shouldRotate ? ph.hole_width! : ph.hole_height!
      const holeRadius = holeHeight / 2
      const rectLength = Math.abs(holeWidth - holeHeight)

      let pillHole: Geom3

      pillHole = union(
        cuboid({
          center: [ph.x, ph.y, 0],
          size: shouldRotate
            ? [holeHeight, rectLength, this.ctx.pcbThickness * 1.5]
            : [rectLength, holeHeight, this.ctx.pcbThickness * 1.5],
        }),
        cylinder({
          center: shouldRotate
            ? [ph.x, ph.y - rectLength / 2, 0]
            : [ph.x - rectLength / 2, ph.y, 0],
          radius: holeRadius,
          height: this.ctx.pcbThickness * 1.5,
        }),
        cylinder({
          center: shouldRotate
            ? [ph.x, ph.y + rectLength / 2, 0]
            : [ph.x + rectLength / 2, ph.y, 0],
          radius: holeRadius,
          height: this.ctx.pcbThickness * 1.5,
        }),
      )

      if (ph.ccw_rotation) {
        const rotationRadians = (ph.ccw_rotation * Math.PI) / 180
        pillHole = translate(
          [ph.x, ph.y, 0],
          rotateZ(rotationRadians, translate([-ph.x, -ph.y, 0], pillHole)),
        )
      }

      if (!opts.dontCutBoard) {
        this.boardGeom = subtract(this.boardGeom, pillHole)
      }
      // Drill through pads

      this.padGeoms = this.padGeoms.map((pg) =>
        colorize(colors.copper, subtract(pg, pillHole)),
      )

      const platedHoleGeom = platedHole(ph, this.ctx, {
        clipGeom: this.boardClipGeom,
      })
      this.platedHoleGeoms.push(platedHoleGeom)
    } else if (ph.shape === "pill_hole_with_rect_pad") {
      if (
        (ph.hole_shape && ph.hole_shape !== "pill") ||
        (ph.pad_shape && ph.pad_shape !== "rect")
      ) {
        return
      }
      const shouldRotate = ph.hole_height! > ph.hole_width!
      const holeWidth = shouldRotate ? ph.hole_height! : ph.hole_width!
      const holeHeight = shouldRotate ? ph.hole_width! : ph.hole_height!
      const holeRadius = holeHeight / 2
      const rectLength = Math.abs(holeWidth - holeHeight)

      let pillHole: Geom3

      pillHole = union(
        cuboid({
          center: [
            ph.x + (ph.hole_offset_x || 0),
            ph.y + (ph.hole_offset_y || 0),
            0,
          ],
          size: shouldRotate
            ? [holeHeight, rectLength, this.ctx.pcbThickness * 1.5]
            : [rectLength, holeHeight, this.ctx.pcbThickness * 1.5],
        }),
        cylinder({
          center: shouldRotate
            ? [
                ph.x + (ph.hole_offset_x || 0),
                ph.y + (ph.hole_offset_y || 0) - rectLength / 2,
                0,
              ]
            : [
                ph.x + (ph.hole_offset_x || 0) - rectLength / 2,
                ph.y + (ph.hole_offset_y || 0),
                0,
              ],
          radius: holeRadius,
          height: this.ctx.pcbThickness * 1.5,
        }),
        cylinder({
          center: shouldRotate
            ? [
                ph.x + (ph.hole_offset_x || 0),
                ph.y + (ph.hole_offset_y || 0) + rectLength / 2,
                0,
              ]
            : [
                ph.x + (ph.hole_offset_x || 0) + rectLength / 2,
                ph.y + (ph.hole_offset_y || 0),
                0,
              ],
          radius: holeRadius,
          height: this.ctx.pcbThickness * 1.5,
        }),
      )

      if (!opts.dontCutBoard) {
        this.boardGeom = subtract(this.boardGeom, pillHole)
      }

      this.padGeoms = this.padGeoms.map((pg) =>
        colorize(colors.copper, subtract(pg, pillHole)),
      )

      const platedHoleGeom = platedHole(ph, this.ctx, {
        clipGeom: this.boardClipGeom,
      })
      this.platedHoleGeoms.push(platedHoleGeom)
    } else if (ph.shape === "rotated_pill_hole_with_rect_pad") {
      if (
        (ph.hole_shape && ph.hole_shape !== "rotated_pill") ||
        (ph.pad_shape && ph.pad_shape !== "rect")
      ) {
        return
      }
      const rphHoleWidth = ph.hole_width!
      const rphHoleHeight = ph.hole_height!
      const rphIsHorizontal = rphHoleWidth >= rphHoleHeight
      const rphLongDim = rphIsHorizontal ? rphHoleWidth : rphHoleHeight
      const rphShortDim = rphIsHorizontal ? rphHoleHeight : rphHoleWidth
      const rphHoleRadius = rphShortDim / 2
      const rphRectLength = Math.abs(rphLongDim - rphShortDim)
      const rphHoleOffsetX = ph.hole_offset_x || 0
      const rphHoleOffsetY = ph.hole_offset_y || 0

      // Create the hole geometry at origin, then rotate and translate
      let rphPillHole = union(
        cuboid({
          center: [0, 0, 0],
          size: rphIsHorizontal
            ? [rphRectLength, rphShortDim, this.ctx.pcbThickness * 1.5]
            : [rphShortDim, rphRectLength, this.ctx.pcbThickness * 1.5],
        }),
        cylinder({
          center: rphIsHorizontal
            ? [-rphRectLength / 2, 0, 0]
            : [0, -rphRectLength / 2, 0],
          radius: rphHoleRadius,
          height: this.ctx.pcbThickness * 1.5,
        }),
        cylinder({
          center: rphIsHorizontal
            ? [rphRectLength / 2, 0, 0]
            : [0, rphRectLength / 2, 0],
          radius: rphHoleRadius,
          height: this.ctx.pcbThickness * 1.5,
        }),
      )

      // Apply hole rotation
      const rphHoleRotationRadians =
        ((ph.hole_ccw_rotation || 0) * Math.PI) / 180
      const rphRotatedOffsetX =
        rphHoleOffsetX * Math.cos(rphHoleRotationRadians) -
        rphHoleOffsetY * Math.sin(rphHoleRotationRadians)
      const rphRotatedOffsetY =
        rphHoleOffsetX * Math.sin(rphHoleRotationRadians) +
        rphHoleOffsetY * Math.cos(rphHoleRotationRadians)

      rphPillHole = rotateZ(rphHoleRotationRadians, rphPillHole)

      // Translate to final position
      const pillHole = translate(
        [ph.x + rphRotatedOffsetX, ph.y + rphRotatedOffsetY, 0],
        rphPillHole,
      )

      if (!opts.dontCutBoard) {
        this.boardGeom = subtract(this.boardGeom, pillHole)
      }

      this.padGeoms = this.padGeoms.map((pg) =>
        colorize(colors.copper, subtract(pg, pillHole)),
      )

      const platedHoleGeom = platedHole(ph, this.ctx, {
        clipGeom: this.boardClipGeom,
      })
      this.platedHoleGeoms.push(platedHoleGeom)
    } else if (ph.shape === "hole_with_polygon_pad") {
      const padOutline = ph.pad_outline
      if (!Array.isArray(padOutline) || padOutline.length < 3) {
        return
      }

      const holeDepth = this.ctx.pcbThickness * 1.5
      const boardHole = createHoleWithPolygonPadHoleGeom(ph, holeDepth, {
        sizeDelta: 2 * M,
      })
      const copperHole = createHoleWithPolygonPadHoleGeom(ph, holeDepth, {
        sizeDelta: -2 * M,
      })

      if (!boardHole || !copperHole) return

      if (!opts.dontCutBoard) {
        this.boardGeom = subtract(this.boardGeom, boardHole)
      }

      this.padGeoms = this.padGeoms.map((pg) =>
        colorize(colors.copper, subtract(pg, boardHole)),
      )

      this.platedHoleGeoms = this.platedHoleGeoms.map((phg) =>
        colorize(colors.copper, subtract(phg, copperHole)),
      )

      const platedHoleGeom = platedHole(ph, this.ctx, {
        clipGeom: this.boardClipGeom,
      })
      this.platedHoleGeoms.push(platedHoleGeom)
    }
  }

  private processHole(hole: PcbHole) {
    if (!this.boardGeom) return

    const holeDepth = this.ctx.pcbThickness * 1.5 // still cut through board fully
    const copperInset = 0.02 // tiny offset for plated hole copper cut

    if (hole.hole_shape === "circle") {
      const cyGeom = cylinder({
        center: [hole.x, hole.y, 0],
        radius: hole.hole_diameter / 2 + M,
        height: holeDepth,
      })

      // normal cut for board
      this.boardGeom = subtract(this.boardGeom, cyGeom)

      // normal pad cut
      this.padGeoms = this.padGeoms.map((pg) =>
        colorize(colors.copper, subtract(pg, cyGeom)),
      )

      // slightly smaller cut from plated holes (copper overlap)
      const copperCut = cylinder({
        center: [hole.x, hole.y, 0],
        radius: hole.hole_diameter / 2 + M / 2,
        height: holeDepth,
      })
      this.platedHoleGeoms = this.platedHoleGeoms.map((phg) =>
        colorize(colors.copper, subtract(phg, copperCut)),
      )
    } else if (
      hole.hole_shape === "pill" ||
      hole.hole_shape === "rotated_pill" ||
      hole.hole_shape === "oval"
    ) {
      const holeWidth = (hole as any).hole_width ?? (hole as any).hole_diameter
      const holeHeight =
        (hole as any).hole_height ?? (hole as any).hole_diameter
      const rotation = (hole as any).ccw_rotation ?? (hole as any).rotation ?? 0
      const copperInset = 0.02

      const createHoleGeom = (
        w: number,
        h: number,
        depth: number,
        isOval: boolean,
      ) => {
        if (w <= 0 || h <= 0) return null
        if (isOval) {
          return translate(
            [0, 0, -depth / 2],
            extrudeLinear(
              { height: depth },
              ellipse({ radius: [w / 2, h / 2] }),
            ),
          )
        }
        const radius = Math.min(w, h) / 2
        const length = Math.abs(w - h)
        if (w > h) {
          return union(
            cuboid({ center: [0, 0, 0], size: [length, h, depth] }),
            cylinder({ center: [-length / 2, 0, 0], radius, height: depth }),
            cylinder({ center: [length / 2, 0, 0], radius, height: depth }),
          )
        }
        return union(
          cuboid({ center: [0, 0, 0], size: [w, length, depth] }),
          cylinder({ center: [0, -length / 2, 0], radius, height: depth }),
          cylinder({ center: [0, length / 2, 0], radius, height: depth }),
        )
      }

      let boardHole = createHoleGeom(
        holeWidth,
        holeHeight,
        holeDepth,
        hole.hole_shape === "oval",
      )
      let copperCut = createHoleGeom(
        holeWidth - 2 * copperInset,
        holeHeight - 2 * copperInset,
        holeDepth,
        hole.hole_shape === "oval",
      )

      if (boardHole && rotation !== 0) {
        boardHole = rotateZ((rotation * Math.PI) / 180, boardHole)
      }
      if (copperCut && rotation !== 0) {
        copperCut = rotateZ((rotation * Math.PI) / 180, copperCut)
      }

      if (boardHole) {
        const positionedBoardHole = translate([hole.x, hole.y, 0], boardHole)
        this.boardGeom = subtract(this.boardGeom, positionedBoardHole)
        this.padGeoms = this.padGeoms.map((pg) =>
          colorize(colors.copper, subtract(pg, positionedBoardHole)),
        )
      }

      if (copperCut) {
        const positionedCopperCut = translate([hole.x, hole.y, 0], copperCut)
        this.platedHoleGeoms = this.platedHoleGeoms.map((phg) =>
          colorize(colors.copper, subtract(phg, positionedCopperCut)),
        )
      }
    }
  }

  private processPad(pad: PcbSmtPad) {
    const layerSign = pad.layer === "bottom" ? -1 : 1
    const zPos =
      (layerSign * this.ctx.pcbThickness) / 2 +
      layerSign * BOARD_SURFACE_OFFSET.copper // Slightly offset from board surface

    const rectBorderRadius = extractRectBorderRadius(pad)

    if (pad.shape === "rect") {
      const basePadGeom = createCenteredRectPadGeom(
        pad.width,
        pad.height,
        M,
        rectBorderRadius,
      )
      const positionedPadGeom = translate([pad.x, pad.y, zPos], basePadGeom)
      let finalPadGeom: Geom3 = positionedPadGeom
      if (this.boardClipGeom) {
        finalPadGeom = intersect(this.boardClipGeom, finalPadGeom)
      }
      finalPadGeom = colorize(colors.copper, finalPadGeom)
      this.padGeoms.push(finalPadGeom)
    } else if (pad.shape === "rotated_rect") {
      let basePadGeom = createCenteredRectPadGeom(
        pad.width,
        pad.height,
        M,
        rectBorderRadius,
      )
      const rotationRadians = (pad.ccw_rotation * Math.PI) / 180
      basePadGeom = rotateZ(rotationRadians, basePadGeom)
      // Translate to final position
      const positionedPadGeom = translate([pad.x, pad.y, zPos], basePadGeom)
      let finalPadGeom: Geom3 = positionedPadGeom
      if (this.boardClipGeom) {
        finalPadGeom = intersect(this.boardClipGeom, finalPadGeom)
      }
      finalPadGeom = colorize(colors.copper, finalPadGeom)
      this.padGeoms.push(finalPadGeom)
    } else if (pad.shape === "circle") {
      let padGeom = cylinder({
        center: [pad.x, pad.y, zPos],
        radius: pad.radius,
        height: M,
      })
      if (this.boardClipGeom) {
        padGeom = intersect(this.boardClipGeom, padGeom)
      }
      padGeom = colorize(colors.copper, padGeom)
      this.padGeoms.push(padGeom)
    }
  }

  private processVia(via: PcbVia) {
    if (!this.boardGeom) return

    // Create via copper geometry (barrel + annular rings)
    if (
      typeof via.outer_diameter === "number" &&
      typeof via.hole_diameter === "number"
    ) {
      const viaCopperGeom = createViaCopper({
        x: via.x,
        y: via.y,
        outerDiameter: via.outer_diameter,
        holeDiameter: via.hole_diameter,
        thickness: this.ctx.pcbThickness,
      })

      // Clip via copper to board boundaries if needed
      let finalViaGeom = viaCopperGeom
      if (this.boardClipGeom) {
        finalViaGeom = intersect(this.boardClipGeom, viaCopperGeom)
        // Reapply color after intersect (intersect may remove color)
        finalViaGeom = colorize(colors.copper, finalViaGeom)
      }

      this.viaGeoms.push(finalViaGeom)
    }

    // Create board drill for via hole
    if (typeof via.hole_diameter === "number") {
      const viaDrill = createViaBoardDrill({
        x: via.x,
        y: via.y,
        holeDiameter: via.hole_diameter,
        thickness: this.ctx.pcbThickness,
      })

      // Subtract drill from board
      this.boardGeom = subtract(this.boardGeom, viaDrill)

      // Cut drill through any existing pads
      this.padGeoms = this.padGeoms.map((pg) =>
        colorize(colors.copper, subtract(pg, viaDrill)),
      )
    }
  }

  private finalize() {
    if (!this.boardGeom) return
    // Colorize the final board geometry
    const boardMaterialColor =
      boardMaterialColors[this.board.material] ?? colors.fr4Tan
    this.boardGeom = colorize(boardMaterialColor, this.boardGeom)

    this.finalGeoms = [
      this.boardGeom,
      ...this.platedHoleGeoms,
      ...this.padGeoms,
      ...this.viaGeoms,
      ...this.copperPourGeoms,
    ]

    if (this.onCompleteCallback) {
      this.onCompleteCallback(this.finalGeoms)
    }
  }

  getGeoms(): Geom3[] {
    return this.finalGeoms
  }
}
