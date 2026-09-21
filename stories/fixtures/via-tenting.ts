import type {
  AnyCircuitElement,
  PcbBoard,
  PcbSilkscreenText,
  PcbTrace,
  PcbVia,
} from "circuit-json"

type ExpectedTenting = "TENTED" | "EXPOSED"

interface ViaCase {
  id: string
  x: number
  top?: boolean
  bottom?: boolean
  expectedTop: ExpectedTenting
  expectedBottom: ExpectedTenting
}

interface BoardFixture {
  id: string
  centerX: number
  defaultTop: boolean
  defaultBottom: boolean
  cases: ViaCase[]
}

const boardFixtures: BoardFixture[] = [
  {
    id: "A",
    centerX: -20,
    defaultTop: true,
    defaultBottom: false,
    cases: [
      {
        id: "inherited",
        x: -14,
        expectedTop: "TENTED",
        expectedBottom: "EXPOSED",
      },
      {
        id: "exposed",
        x: -5,
        top: false,
        bottom: false,
        expectedTop: "EXPOSED",
        expectedBottom: "EXPOSED",
      },
      {
        id: "tented",
        x: 5,
        top: true,
        bottom: true,
        expectedTop: "TENTED",
        expectedBottom: "TENTED",
      },
      {
        id: "top_override",
        x: 14,
        top: false,
        expectedTop: "EXPOSED",
        expectedBottom: "EXPOSED",
      },
    ],
  },
  {
    id: "B",
    centerX: 20,
    defaultTop: false,
    defaultBottom: true,
    cases: [
      {
        id: "inherited",
        x: -14,
        expectedTop: "EXPOSED",
        expectedBottom: "TENTED",
      },
      {
        id: "exposed",
        x: -5,
        top: false,
        bottom: false,
        expectedTop: "EXPOSED",
        expectedBottom: "EXPOSED",
      },
      {
        id: "tented",
        x: 5,
        top: true,
        bottom: true,
        expectedTop: "TENTED",
        expectedBottom: "TENTED",
      },
      {
        id: "top_override",
        x: 14,
        top: false,
        expectedTop: "EXPOSED",
        expectedBottom: "TENTED",
      },
    ],
  },
]

const formatTenting = (value: boolean | undefined) =>
  value === undefined ? "unset" : String(value)

const getTentingProps = ({ top, bottom }: ViaCase) => ({
  ...(top !== undefined && { tented_on_top: top }),
  ...(bottom !== undefined && { tented_on_bottom: bottom }),
})

const createLabels = ({
  id,
  boardId,
  text,
  x,
  y,
  fontSize,
}: {
  id: string
  boardId: string
  text: string
  x: number
  y: number
  fontSize: number
}): PcbSilkscreenText[] =>
  (["top", "bottom"] as const).map((layer) => ({
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: `${boardId}_${id}_${layer}`,
    pcb_component_id: `${boardId}_labels`,
    subcircuit_id: boardId,
    text,
    layer,
    font: "tscircuit2024",
    font_size: fontSize,
    anchor_position: { x, y },
    anchor_alignment: "center",
  }))

const createBoardFixture = ({
  id,
  centerX,
  defaultTop,
  defaultBottom,
  cases,
}: BoardFixture): AnyCircuitElement[] => {
  const boardId = `board_${id}`
  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: boardId,
    subcircuit_id: boardId,
    center: { x: centerX, y: 0 },
    width: 38,
    height: 34,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    default_via_tented_on_top: defaultTop,
    default_via_tented_on_bottom: defaultBottom,
  }

  const labels: PcbSilkscreenText[] = [
    ...createLabels({
      id: "board_defaults",
      boardId,
      text: `BOARD ${id}\nDefaults: top ${defaultTop}, bottom ${defaultBottom}`,
      x: centerX,
      y: 14,
      fontSize: 1,
    }),
    ...createLabels({
      id: "standalone_heading",
      boardId,
      text: "Standalone pcb_via",
      x: centerX,
      y: 10.5,
      fontSize: 0.8,
    }),
    ...createLabels({
      id: "route_heading",
      boardId,
      text: "pcb_trace.route vias",
      x: centerX,
      y: -3,
      fontSize: 0.8,
    }),
  ]

  const vias: PcbVia[] = []
  const traces: PcbTrace[] = []

  for (const viaCase of cases) {
    const x = centerX + viaCase.x
    const caseLabel = [
      `top: ${formatTenting(viaCase.top)}`,
      `bottom: ${formatTenting(viaCase.bottom)}`,
      `Expect top: ${viaCase.expectedTop}`,
      `Expect bottom: ${viaCase.expectedBottom}`,
    ].join("\n")

    labels.push(
      ...createLabels({
        id: `standalone_${viaCase.id}`,
        boardId,
        text: caseLabel,
        x,
        y: 7.5,
        fontSize: 0.55,
      }),
      ...createLabels({
        id: `route_${viaCase.id}`,
        boardId,
        text: caseLabel,
        x,
        y: -6,
        fontSize: 0.55,
      }),
    )

    vias.push({
      type: "pcb_via",
      pcb_via_id: `${boardId}_standalone_${viaCase.id}`,
      subcircuit_id: boardId,
      x,
      y: 2.5,
      outer_diameter: 2.4,
      hole_diameter: 1,
      layers: ["top", "bottom"],
      ...getTentingProps(viaCase),
    })

    traces.push({
      type: "pcb_trace",
      pcb_trace_id: `${boardId}_trace_${viaCase.id}`,
      subcircuit_id: boardId,
      route: [
        { route_type: "wire", x: x - 2.5, y: -11, width: 0.5, layer: "top" },
        { route_type: "wire", x, y: -11, width: 0.5, layer: "top" },
        {
          route_type: "via",
          x,
          y: -11,
          from_layer: "top",
          to_layer: "bottom",
          outer_diameter: 2.4,
          hole_diameter: 1,
          ...getTentingProps(viaCase),
        },
        { route_type: "wire", x, y: -11, width: 0.5, layer: "bottom" },
        {
          route_type: "wire",
          x: x + 2.5,
          y: -11,
          width: 0.5,
          layer: "bottom",
        },
      ],
    })
  }

  return [board, ...labels, ...vias, ...traces]
}

export const viaTentingCircuit = boardFixtures.flatMap(createBoardFixture)
