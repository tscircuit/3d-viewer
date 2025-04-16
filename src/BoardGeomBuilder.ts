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
  Point,
} from "circuit-json"
import { su } from "@tscircuit/soup-util"
import { translate } from "@jscad/modeling/src/operations/transforms"
import { cuboid, cylinder, line } from "@jscad/modeling/src/primitives"
import { colorize } from "@jscad/modeling/src/colors"
import { subtract, union } from "@jscad/modeling/src/operations/booleans"
import { platedHole } from "./geoms/plated-hole"
import { M, colors } from "./geoms/constants"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { expand } from "@jscad/modeling/src/operations/expansions"
import { createBoardGeomWithOutline } from "./geoms/create-board-with-outline"
import type { Vec2 } from "@jscad/modeling/src/maths/types"
import { createSilkscreenTextGeoms } from "./geoms/create-geoms-for-silkscreen-text"
import type { GeomContext } from "./GeomContext"

type BuilderState =
  | "initializing"
  | "processing_plated_holes"
  | "processing_holes"
  | "processing_pads"
  | "processing_traces"
  | "processing_vias"
  | "processing_silkscreen"
  | "finalizing"
  | "done"

const buildStateOrder: BuilderState[] = [
  "initializing",
  "processing_plated_holes",
  "processing_holes",
  "processing_pads",
  "processing_traces",
  "processing_vias",
  "processing_silkscreen",
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

  private boardGeom: Geom3 | null = null
  private platedHoleGeoms: Geom3[] = []
  private holeGeoms: Geom3[] = [] // Currently only used for subtraction
  private padGeoms: Geom3[] = []
  private traceGeoms: Geom3[] = []
  private viaGeoms: Geom3[] = [] // Combined with platedHoleGeoms
  private silkscreenGeoms: Geom3[] = []

  private state: BuilderState = "initializing"
  private currentIndex = 0
  private ctx: GeomContext
  private onCompleteCallback?: (geoms: Geom3[]) => void
  private finalGeoms: Geom3[] = []

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

    this.ctx = { pcbThickness: 1.2 } // TODO derive from board?

    // Start processing
    this.initializeBoard()
  }

  private initializeBoard() {
    if (this.board.outline && this.board.outline.length > 0) {
      this.boardGeom = createBoardGeomWithOutline(
        {
          center: this.board.center,
          outline: this.board.outline!,
        },
        this.ctx.pcbThickness,
      )
    } else {
      this.boardGeom = cuboid({
        size: [this.board.width, this.board.height, this.ctx.pcbThickness],
        center: [this.board.center.x, this.board.center.y, 0],
      })
    }
    this.state = "processing_plated_holes"
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

        case "processing_silkscreen":
          if (this.currentIndex < this.silkscreenTexts.length) {
            this.processSilkscreenText(this.silkscreenTexts[this.currentIndex]!)
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

  private processPlatedHole(
    ph: PCBPlatedHole,
    opts: { dontCutBoard?: boolean } = {},
  ) {
    if (!this.boardGeom) return

    if (ph.shape === "circle") {
      const cyGeom = cylinder({
        center: [ph.x, ph.y, 0],
        radius: ph.hole_diameter / 2 + M, // Add margin for subtraction
        height: this.ctx.pcbThickness * 1.5, // Ensure it cuts through
      })

      if (!opts.dontCutBoard) {
        this.boardGeom = subtract(this.boardGeom, cyGeom)
      }

      const platedHoleGeom = platedHole(ph, this.ctx)
      this.platedHoleGeoms.push(platedHoleGeom)
    } else if (ph.shape === "pill") {
      const shouldRotate = ph.hole_height! > ph.hole_width!
      const holeWidth = shouldRotate ? ph.hole_height! : ph.hole_width!
      const holeHeight = shouldRotate ? ph.hole_width! : ph.hole_height!
      const holeRadius = holeHeight / 2
      const rectLength = Math.abs(holeWidth - holeHeight)

      const pillHole = union(
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
      if (!opts.dontCutBoard) {
        this.boardGeom = subtract(this.boardGeom, pillHole)
      }

      const platedHoleGeom = platedHole(ph, this.ctx)
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
    }
    // TODO: Handle other hole shapes if necessary
  }

  private processPad(pad: PcbSmtPad) {
    const layerSign = pad.layer === "bottom" ? -1 : 1
    const zPos = (layerSign * this.ctx.pcbThickness) / 2 + layerSign * M * 2 // Slightly offset from board surface

    if (pad.shape === "rect") {
      const padGeom = colorize(
        colors.copper,
        cuboid({
          center: [pad.x, pad.y, zPos],
          size: [pad.width, pad.height, M],
        }),
      )
      this.padGeoms.push(padGeom)
    } else if (pad.shape === "circle") {
      const padGeom = colorize(
        colors.copper,
        cylinder({
          center: [pad.x, pad.y, zPos],
          radius: pad.radius,
          height: M,
        }),
      )
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

        traceGeom = colorize(colors.fr4GreenSolderWithMask, traceGeom)
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
        fontSize * 0.2,
      )
      const expandedPath = expand(
        { delta: expansionDelta, corners: "round" },
        textPath,
      )

      let textGeom = translate(
        [0, 0, this.ctx.pcbThickness / 2 + M], // Position above board
        extrudeLinear({ height: 0.012 }, expandedPath),
      )

      textGeom = colorize([1, 1, 1], textGeom) // White
      this.silkscreenGeoms.push(textGeom)
    }
  }

  private finalize() {
    if (!this.boardGeom) return
    // Colorize the final board geometry
    this.boardGeom = colorize(colors.fr4Green, this.boardGeom)

    this.finalGeoms = [
      this.boardGeom,
      ...this.platedHoleGeoms,
      ...this.padGeoms,
      ...this.traceGeoms,
      ...this.viaGeoms,
      ...this.silkscreenGeoms,
    ]

    if (this.onCompleteCallback) {
      this.onCompleteCallback(this.finalGeoms)
    }
  }

  getGeoms(): Geom3[] {
    return this.finalGeoms
  }
}
