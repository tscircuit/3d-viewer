import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type {
  AnyCircuitElement,
  PCBPlatedHole,
  PcbBoard,
  PcbHole,
  PcbSmtPad,
  PcbTrace,
  PcbVia,
  PcbSilkscreenText,
  PcbSilkscreenPath,
  Point,
  PcbCutout,
  PcbCopperPour,
} from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { translate, rotateZ } from "@jscad/modeling/src/operations/transforms"
import {
  cuboid,
  cylinder,
  line,
  polygon as jscadPolygon,
  roundedRectangle,
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
} from "./geoms/constants"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { expand } from "@jscad/modeling/src/operations/expansions"
import {
  createBoardGeomWithOutline,
  arePointsClockwise,
} from "./geoms/create-board-with-outline"
import type { Vec2 } from "@jscad/modeling/src/maths/types"
import { createSilkscreenTextGeoms } from "./geoms/create-geoms-for-silkscreen-text"
import { createSilkscreenPathGeom } from "./geoms/create-geoms-for-silkscreen-path"
import { createGeom2FromBRep } from "./geoms/brep-converter"
import type { GeomContext } from "./GeomContext"
import {
  clampRectBorderRadius,
  extractRectBorderRadius,
} from "./utils/rect-border-radius"

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
  | "processing_plated_holes"
  | "processing_holes"
  | "processing_pads"
  | "processing_traces"
  | "processing_vias"
  | "processing_silkscreen_text"
  | "processing_silkscreen_paths"
  | "processing_cutouts"
  | "processing_copper_pours"
  | "finalizing"
  | "done"

const buildStateOrder: BuilderState[] = [
  "initializing",
  "processing_pads",
  "processing_copper_pours",

  "processing_plated_holes",
  "processing_holes",
  "processing_cutouts",

  "processing_traces",
  "processing_vias",
  "processing_silkscreen_text",
  "processing_silkscreen_paths",
  "finalizing",
  "done",
]

export class BoardGeomBuilder {
  private circuitJson: AnyCircuitElement[]
  private board: PcbBoard
  private plated_holes: PCBPlatedHole[]
  private holes: PcbHole[]
  private pads: PcbSmtPad[]
  private traces: PcbTrace[]
  private pcb_vias: PcbVia[]
  private silkscreenTexts: PcbSilkscreenText[]
  private silkscreenPaths: PcbSilkscreenPath[]
  private pcb_cutouts: PcbCutout[]
  private pcb_copper_pours: PcbCopperPour[]

  private boardGeom: Geom3 | null = null
  private platedHoleGeoms: Geom3[] = []
  private holeGeoms: Geom3[] = [] // Currently only used for subtraction
  private padGeoms: Geom3[] = []
  private traceGeoms: Geom3[] = []
  private viaGeoms: Geom3[] = [] // Combined with platedHoleGeoms
  private silkscreenTextGeoms: Geom3[] = []
  private silkscreenPathGeoms: Geom3[] = []
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

    // Extract elements
    this.board = su(circuitJson).pcb_board.list()[0]!
    this.plated_holes = su(circuitJson).pcb_plated_hole.list()
    this.holes = su(circuitJson).pcb_hole.list()
    this.pads = su(circuitJson).pcb_smtpad.list()
    this.traces = su(circuitJson).pcb_trace.list()
    this.pcb_vias = su(circuitJson).pcb_via.list()
    this.silkscreenTexts = su(circuitJson).pcb_silkscreen_text.list()
    this.silkscreenPaths = su(circuitJson).pcb_silkscreen_path.list()
    this.pcb_cutouts = su(circuitJson).pcb_cutout.list()
    this.pcb_copper_pours = circuitJson.filter(
      (e) => e.type === "pcb_copper_pour",
    ) as any

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
        size: [this.board.width, this.board.height, this.ctx.pcbThickness],
        center: [this.board.center.x, this.board.center.y, 0],
      })
      this.boardClipGeom = cuboid({
        size: [
          this.board.width + 2 * BOARD_CLIP_XY_OUTSET,
          this.board.height + 2 * BOARD_CLIP_XY_OUTSET,
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
            // Skip traces and vias for now
            this.goToNextState()
          }
          break

        case "processing_traces":
          if (this.currentIndex < this.traces.length) {
            this.processTrace(this.traces[this.currentIndex]!)
            this.currentIndex++
          } else {
            this.goToNextState()
          }
          break

        case "processing_vias":
          if (this.currentIndex < this.pcb_vias.length) {
            this.processVia(this.pcb_vias[this.currentIndex]!)
            this.currentIndex++
          } else {
            this.goToNextState()
          }
          break

        case "processing_silkscreen_text":
          if (this.currentIndex < this.silkscreenTexts.length) {
            this.processSilkscreenText(this.silkscreenTexts[this.currentIndex]!)
            this.currentIndex++
          } else {
            this.goToNextState()
          }
          break

        case "processing_silkscreen_paths":
          if (this.currentIndex < this.silkscreenPaths.length) {
            this.processSilkscreenPath(this.silkscreenPaths[this.currentIndex]!)
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

        case "processing_copper_pours":
          if (this.currentIndex < this.pcb_copper_pours.length) {
            this.processCopperPour(this.pcb_copper_pours[this.currentIndex]!)
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
      case "rect":
        cutoutGeom = cuboid({
          center: [cutout.center.x, cutout.center.y, 0],
          size: [cutout.width, cutout.height, cutoutHeight],
        })
        if (cutout.rotation) {
          const rotationRadians = (cutout.rotation * Math.PI) / 180
          cutoutGeom = rotateZ(rotationRadians, cutoutGeom)
        }
        break
      case "circle":
        cutoutGeom = cylinder({
          center: [cutout.center.x, cutout.center.y, 0],
          radius: cutout.radius,
          height: cutoutHeight,
        })
        break
      case "polygon":
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

    if (cutoutGeom) {
      this.boardGeom = subtract(this.boardGeom, cutoutGeom)
    }
  }

  private processCopperPour(pour: PcbCopperPour) {
    const layerSign = pour.layer === "bottom" ? -1 : 1
    const zPos = (layerSign * this.ctx.pcbThickness) / 2 + layerSign * M

    let pourGeom: Geom3 | null = null

    if (pour.shape === "rect") {
      let baseGeom = cuboid({
        center: [0, 0, 0], // Create at origin for rotation
        size: [pour.width, pour.height, M],
      })

      if ("rotation" in pour && pour.rotation) {
        const rotationRadians = (pour.rotation * Math.PI) / 180
        baseGeom = rotateZ(rotationRadians, baseGeom)
      }

      pourGeom = translate([pour.center.x, pour.center.y, zPos], baseGeom)
    } else if (pour.shape === "brep") {
      const brepShape = pour.brep_shape
      if (brepShape && brepShape.outer_ring) {
        const pourGeom2 = createGeom2FromBRep(brepShape)
        pourGeom = extrudeLinear({ height: M }, pourGeom2)
        pourGeom = translate([0, 0, zPos], pourGeom)
      }
    } else if (pour.shape === "polygon") {
      let pointsVec2: Vec2[] = pour.points.map((p) => [p.x, p.y])
      if (pointsVec2.length < 3) {
        console.warn(
          `PCB Copper Pour [${pour.pcb_copper_pour_id}] polygon has fewer than 3 points, skipping.`,
        )
        return
      }
      if (arePointsClockwise(pointsVec2)) {
        pointsVec2 = pointsVec2.reverse()
      }
      const polygon2d = jscadPolygon({ points: pointsVec2 })
      pourGeom = extrudeLinear({ height: M }, polygon2d)
      pourGeom = translate([0, 0, zPos], pourGeom)
    }

    if (pourGeom) {
      // TODO subtract vias/holes etc.
      if (this.boardClipGeom) {
        pourGeom = intersect(this.boardClipGeom, pourGeom)
      }
      const coloredPourGeom = colorize(colors.copper, pourGeom)
      this.copperPourGeoms.push(coloredPourGeom)
    }
  }

  private processPlatedHole(
    ph: PCBPlatedHole,
    opts: { dontCutBoard?: boolean } = {},
  ) {
    if (!this.boardGeom) return

    if (ph.shape === "circle" || ph.shape === "circular_hole_with_rect_pad") {
      let cyGeom: Geom3 | null = null

      if (ph.shape === "circular_hole_with_rect_pad") {
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
    } else if (ph.shape === "pill" || ph.shape === "pill_hole_with_rect_pad") {
      const shouldRotate = ph.hole_height! > ph.hole_width!
      const holeWidth = shouldRotate ? ph.hole_height! : ph.hole_width!
      const holeHeight = shouldRotate ? ph.hole_width! : ph.hole_height!
      const holeRadius = holeHeight / 2
      const rectLength = Math.abs(holeWidth - holeHeight)

      let pillHole: Geom3

      if (ph.shape === "pill_hole_with_rect_pad") {
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
      } else {
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
    }
  }

  private processHole(hole: PcbHole) {
    if (!this.boardGeom) return
    // @ts-expect-error TODO fix type PcbHole doesn't have hole_shape
    if (hole.hole_shape === "round" || hole.hole_shape === "circle") {
      const cyGeom = cylinder({
        center: [hole.x, hole.y, 0],
        radius: hole.hole_diameter / 2 + M, // Add margin for subtraction
        height: this.ctx.pcbThickness * 1.5, // Ensure it cuts through
      })
      this.boardGeom = subtract(this.boardGeom, cyGeom)
      // Remove hole material from any pads it intersects
      this.padGeoms = this.padGeoms.map((pg) =>
        colorize(colors.copper, subtract(pg, cyGeom)),
      )
    } else if (hole.hole_shape === "pill") {
      const holeWidth = hole.hole_width
      const holeHeight = hole.hole_height
      const holeRadius = Math.min(holeWidth, holeHeight) / 2
      const rectLength = Math.abs(holeWidth - holeHeight)

      // Create the pill shape (rounded rectangle) at hole position
      let pillHole: Geom3
      if (holeWidth > holeHeight) {
        // Horizontal pill
        pillHole = union(
          cuboid({
            center: [hole.x, hole.y, 0],
            size: [rectLength, holeHeight, this.ctx.pcbThickness * 1.5],
          }),
          cylinder({
            center: [hole.x - rectLength / 2, hole.y, 0],
            radius: holeRadius,
            height: this.ctx.pcbThickness * 1.5,
          }),
          cylinder({
            center: [hole.x + rectLength / 2, hole.y, 0],
            radius: holeRadius,
            height: this.ctx.pcbThickness * 1.5,
          }),
        )
      } else {
        // Vertical pill
        pillHole = union(
          cuboid({
            center: [hole.x, hole.y, 0],
            size: [holeWidth, rectLength, this.ctx.pcbThickness * 1.5],
          }),
          cylinder({
            center: [hole.x, hole.y - rectLength / 2, 0],
            radius: holeRadius,
            height: this.ctx.pcbThickness * 1.5,
          }),
          cylinder({
            center: [hole.x, hole.y + rectLength / 2, 0],
            radius: holeRadius,
            height: this.ctx.pcbThickness * 1.5,
          }),
        )
      }

      this.boardGeom = subtract(this.boardGeom, pillHole)
      // Remove hole material from any pads it intersects
      this.padGeoms = this.padGeoms.map((pg) =>
        colorize(colors.copper, subtract(pg, pillHole)),
      )
    } else if (hole.hole_shape === "rotated_pill") {
      const holeWidth = hole.hole_width
      const holeHeight = hole.hole_height
      const holeRadius = Math.min(holeWidth, holeHeight) / 2
      const rectLength = Math.abs(holeWidth - holeHeight)

      // Create the pill shape (rounded rectangle) at origin
      let pillHole: Geom3
      if (holeWidth > holeHeight) {
        // Horizontal pill
        pillHole = union(
          cuboid({
            center: [0, 0, 0],
            size: [rectLength, holeHeight, this.ctx.pcbThickness * 1.5],
          }),
          cylinder({
            center: [-rectLength / 2, 0, 0],
            radius: holeRadius,
            height: this.ctx.pcbThickness * 1.5,
          }),
          cylinder({
            center: [rectLength / 2, 0, 0],
            radius: holeRadius,
            height: this.ctx.pcbThickness * 1.5,
          }),
        )
      } else {
        // Vertical pill
        pillHole = union(
          cuboid({
            center: [0, 0, 0],
            size: [holeWidth, rectLength, this.ctx.pcbThickness * 1.5],
          }),
          cylinder({
            center: [0, -rectLength / 2, 0],
            radius: holeRadius,
            height: this.ctx.pcbThickness * 1.5,
          }),
          cylinder({
            center: [0, rectLength / 2, 0],
            radius: holeRadius,
            height: this.ctx.pcbThickness * 1.5,
          }),
        )
      }

      // Apply rotation for rotated_pill shape
      const rotationRadians = (hole.ccw_rotation * Math.PI) / 180
      pillHole = rotateZ(rotationRadians, pillHole)

      // Translate to final position
      pillHole = translate([hole.x, hole.y, 0], pillHole)

      this.boardGeom = subtract(this.boardGeom, pillHole)
      // Remove hole material from any pads it intersects
      this.padGeoms = this.padGeoms.map((pg) =>
        colorize(colors.copper, subtract(pg, pillHole)),
      )
    }
    // TODO: Handle other hole shapes if necessary
  }

  private processPad(pad: PcbSmtPad) {
    const layerSign = pad.layer === "bottom" ? -1 : 1
    const zPos = (layerSign * this.ctx.pcbThickness) / 2 + layerSign * M * 2 // Slightly offset from board surface

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

  private processTrace(trace: PcbTrace) {
    const { route: mixedRoute } = trace
    if (mixedRoute.length < 2) return

    // Group route points into continuous wire segments on the same layer
    let currentSegmentPoints: Vec2[] = []
    let currentLayer: "top" | "bottom" | null = null
    let currentWidth = 0.1 // Default width

    const finishSegment = () => {
      if (currentSegmentPoints.length >= 2 && currentLayer) {
        const layerSign = currentLayer === "bottom" ? -1 : 1
        const zPos = (layerSign * this.ctx.pcbThickness) / 2 + layerSign * M

        const linePath = line(currentSegmentPoints)
        // Use the width of the starting point of the segment for consistency
        const expandedPath = expand(
          { delta: currentWidth / 2, corners: "round" },
          linePath,
        )
        let traceGeom = translate(
          [0, 0, zPos],
          extrudeLinear({ height: M }, expandedPath),
        )

        // TODO: Subtract via/hole overlaps if needed for accuracy
        const startPointCoords = currentSegmentPoints[0]!
        const endPointCoords =
          currentSegmentPoints[currentSegmentPoints.length - 1]!

        const startHole = this.getHoleToCut(
          startPointCoords[0],
          startPointCoords[1],
        )
        if (startHole) {
          const cuttingCylinder = cylinder({
            center: [startPointCoords[0], startPointCoords[1], zPos + M / 2],
            radius: startHole.diameter / 2 + M,
            height: M,
          })
          traceGeom = subtract(traceGeom, cuttingCylinder)
        }

        const endHole = this.getHoleToCut(endPointCoords[0], endPointCoords[1])
        if (endHole) {
          const cuttingCylinder = cylinder({
            center: [endPointCoords[0], endPointCoords[1], zPos + M / 2],
            radius: endHole.diameter / 2 + M,
            height: M,
          })
          traceGeom = subtract(traceGeom, cuttingCylinder)
        }

        const tracesMaterialColor =
          tracesMaterialColors[this.board.material] ??
          colors.fr4GreenSolderWithMask

        if (this.boardClipGeom) {
          traceGeom = intersect(this.boardClipGeom, traceGeom)
        }
        traceGeom = colorize(tracesMaterialColor, traceGeom)

        this.traceGeoms.push(traceGeom)
      }
      currentSegmentPoints = []
      currentLayer = null
    }

    for (let i = 0; i < mixedRoute.length; i++) {
      const point = mixedRoute[i]!

      if (point.route_type === "wire") {
        if (currentLayer === null) {
          // Start of a new segment
          currentLayer = point.layer as any
          currentWidth = point.width
          currentSegmentPoints.push([point.x, point.y])
        } else if (point.layer === currentLayer) {
          // Continue existing segment
          currentSegmentPoints.push([point.x, point.y])
        } else {
          // Layer change - finish previous segment and start new one
          // Add the current point to finish the segment before starting new
          currentSegmentPoints.push([point.x, point.y])
          finishSegment()
          currentLayer = point.layer as any
          currentWidth = point.width
          // Need the previous point to start the new segment correctly
          const prevPoint = mixedRoute[i - 1]
          if (prevPoint) {
            // Start new segment with the via/transition point
            currentSegmentPoints.push([point.x, point.y])
          } else {
            // Should not happen in a valid trace, but handle defensively
            currentSegmentPoints.push([point.x, point.y])
          }
        }
      } else if (point.route_type === "via") {
        // Via encountered - finish the current wire segment
        // Add the via's position as the end point of the current segment
        currentSegmentPoints.push([point.x, point.y])
        finishSegment()
        // The via itself will be handled by processVia/processPlatedHole
        // Start the next segment from the via point if followed by a wire
        const nextPoint = mixedRoute[i + 1]
        if (nextPoint && nextPoint.route_type === "wire") {
          currentLayer = nextPoint.layer as any // Layer might change across via
          currentWidth = nextPoint.width
          currentSegmentPoints.push([point.x, point.y]) // Start next segment at via location
        }
      }
    }

    // Finish the last segment
    finishSegment()
  }

  private processVia(via: PcbVia) {
    // Treat vias like plated holes for geometry generation
    this.processPlatedHole(
      {
        x: via.x,
        y: via.y,
        hole_diameter: via.hole_diameter,
        outer_diameter: via.outer_diameter,
        shape: "circle",
        layers: ["top", "bottom"], // Assume through-hole via
        type: "pcb_plated_hole",
        pcb_plated_hole_id: `via_${via.pcb_via_id}`, // Create a unique-ish ID
      },
      {
        dontCutBoard: true, // Board cut should happen via trace logic or dedicated via cut
      },
    )
  }

  private processSilkscreenText(st: PcbSilkscreenText) {
    const { textOutlines, xOffset, yOffset } = createSilkscreenTextGeoms(st)

    for (const outline of textOutlines) {
      const alignedOutline = outline.map((point) => [
        point[0] + xOffset + st.anchor_position.x,
        point[1] + yOffset + st.anchor_position.y,
      ]) as Vec2[]
      const textPath = line(alignedOutline)

      const fontSize = st.font_size || 0.25
      const expansionDelta = Math.min(
        Math.max(0.01, fontSize * 0.1),
        fontSize * 0.05,
      )
      const expandedPath = expand(
        { delta: expansionDelta, corners: "round" },
        textPath,
      )
      let textGeom: any
      if (st.layer === "bottom") {
        textGeom = translate(
          [0, 0, -this.ctx.pcbThickness / 2 - M], // Position above board
          extrudeLinear({ height: 0.012 }, expandedPath),
        )
      } else {
        textGeom = translate(
          [0, 0, this.ctx.pcbThickness / 2 + M], // Position above board
          extrudeLinear({ height: 0.012 }, expandedPath),
        )
      }
      textGeom = colorize([1, 1, 1], textGeom) // White
      this.silkscreenTextGeoms.push(textGeom)
    }
  }

  private processSilkscreenPath(sp: PcbSilkscreenPath) {
    const pathGeom = createSilkscreenPathGeom(sp, this.ctx)
    if (pathGeom) {
      this.silkscreenPathGeoms.push(pathGeom)
    }
  }

  private finalize() {
    if (!this.boardGeom) return
    // Colorize the final board geometry
    const boardMaterialColor =
      boardMaterialColors[this.board.material] ?? colors.fr4Green
    this.boardGeom = colorize(boardMaterialColor, this.boardGeom)

    this.finalGeoms = [
      this.boardGeom,
      ...this.platedHoleGeoms,
      ...this.padGeoms,
      ...this.traceGeoms,
      ...this.viaGeoms,
      ...this.copperPourGeoms,
      ...this.silkscreenTextGeoms,
      ...this.silkscreenPathGeoms,
    ]

    if (this.onCompleteCallback) {
      this.onCompleteCallback(this.finalGeoms)
    }
  }

  getGeoms(): Geom3[] {
    return this.finalGeoms
  }
}
