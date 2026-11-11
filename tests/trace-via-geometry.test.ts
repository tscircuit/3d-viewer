import { expect, test } from "bun:test"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { measureVolume } from "@jscad/modeling/src/measurements"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement, PcbBoard, PcbVia } from "circuit-json"
import ManifoldModule from "manifold-3d"
import type { CanvasTexture } from "three"
import { BoardGeomBuilder } from "../src/BoardGeomBuilder"
import { createCombinedBoardTextures } from "../src/textures/create-combined-board-textures"
import { getPcbVias } from "../src/utils/get-pcb-vias"
import { processViasForManifold } from "../src/utils/manifold/process-vias"

test("route vias create the same drill and copper geometry as standalone vias", async () => {
  const standaloneVia: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "via",
    x: -2,
    y: 0,
    layers: ["top", "bottom"],
    hole_diameter: 0.8,
    outer_diameter: 1.4,
  }
  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
      min_via_hole_diameter: 0.8,
      min_via_pad_diameter: 1.4,
    },
    standaloneVia,
    {
      type: "pcb_trace",
      pcb_trace_id: "trace",
      route: [
        {
          route_type: "via",
          x: -2,
          y: 0,
          from_layer: "top",
          to_layer: "bottom",
        },
        {
          route_type: "via",
          x: 2,
          y: 0,
          from_layer: "top",
          to_layer: "bottom",
        },
        {
          route_type: "via",
          x: 2,
          y: 0,
          from_layer: "bottom",
          to_layer: "top",
        },
      ],
    },
  ]
  const equivalentCircuit: AnyCircuitElement[] = [
    circuit[0]!,
    standaloneVia,
    { ...standaloneVia, pcb_via_id: "route_via", x: 2 },
  ]

  const buildJscadGeometry = (elements: AnyCircuitElement[]) => {
    let result: Geom3[] = []
    const builder = new BoardGeomBuilder(elements, (geoms) => {
      result = geoms
    })
    while (!builder.step(100)) {}
    return result
  }
  const jscadGeoms = buildJscadGeometry(circuit)
  const expectedGeoms = buildJscadGeometry(equivalentCircuit)
  expect(jscadGeoms).toHaveLength(3)
  expect(jscadGeoms.map((geom) => measureVolume(geom))).toEqual(
    expectedGeoms.map((geom) => measureVolume(geom)),
  )

  const module = await ManifoldModule()
  module.setup()
  const cleanup: InstanceType<typeof module.Manifold>[] = []
  const actual = processViasForManifold(module.Manifold, circuit, 1.6, cleanup)
  const expected = processViasForManifold(
    module.Manifold,
    equivalentCircuit,
    1.6,
    cleanup,
  )
  try {
    expect(actual.viaBoardDrills).toHaveLength(2)
    expect(actual.viaCopperGeoms).toHaveLength(2)
    expect(
      actual.viaBoardDrills.map((drill) => drill.getMesh().vertProperties),
    ).toEqual(
      expected.viaBoardDrills.map((drill) => drill.getMesh().vertProperties),
    )
    expect(
      actual.viaCopperGeoms.map(
        ({ geometry }) => geometry.getAttribute("position").array,
      ),
    ).toEqual(
      expected.viaCopperGeoms.map(
        ({ geometry }) => geometry.getAttribute("position").array,
      ),
    )
  } finally {
    for (const manifold of cleanup) manifold.delete()
    for (const { geometry } of [
      ...actual.viaCopperGeoms,
      ...expected.viaCopperGeoms,
    ])
      geometry.dispose()
  }
})

test("untented route vias render copper annular rings in board textures and getPcbVias normalizes legacy via layers", () => {
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    document: { createElement: () => createCanvas(1, 1) },
  })
  try {
    const board: PcbBoard = {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 6,
      height: 4,
      thickness: 1.6,
      num_layers: 4,
      material: "fr4",
    }

    const vias = getPcbVias([
      board,
      {
        type: "pcb_via",
        pcb_via_id: "legacy_via",
        x: -1,
        y: 0,
        hole_diameter: 0.3,
        outer_diameter: 0.6,
        from_layer: "top",
        to_layer: "bottom",
      } as unknown as PcbVia,
      {
        type: "pcb_trace",
        pcb_trace_id: "inner_trace",
        route: [
          {
            route_type: "via",
            x: -1,
            y: 0,
            from_layer: "top",
            to_layer: "inner1",
          },
        ],
      },
    ])
    expect(vias).toHaveLength(1)
    expect(vias[0]?.layers).toEqual(["top", "bottom"])

    const standaloneTextures = createCombinedBoardTextures({
      boardData: board,
      traceTextureResolution: 50,
      circuitJson: [
        board,
        {
          type: "pcb_via",
          pcb_via_id: "v1",
          x: 0,
          y: 0,
          hole_diameter: 0.6,
          outer_diameter: 1.2,
          layers: ["top", "bottom"],
        },
      ],
    })
    const routeViaTextures = createCombinedBoardTextures({
      boardData: board,
      traceTextureResolution: 50,
      circuitJson: [
        board,
        {
          type: "pcb_trace",
          pcb_trace_id: "t1",
          route: [
            {
              route_type: "via",
              x: 0,
              y: 0,
              from_layer: "top",
              to_layer: "bottom",
              hole_diameter: 0.6,
              outer_diameter: 1.2,
            },
          ],
        },
      ],
    })

    for (const side of ["topBoard", "bottomBoard"] as const) {
      const standaloneRingPixel = Array.from(
        standaloneTextures[side]!.image.getContext("2d").getImageData(
          Math.floor((0.45 + 3) * 50),
          Math.floor(2 * 50),
          1,
          1,
        ).data,
      )
      const routeRingPixel = Array.from(
        routeViaTextures[side]!.image.getContext("2d").getImageData(
          Math.floor((0.45 + 3) * 50),
          Math.floor(2 * 50),
          1,
          1,
        ).data,
      )
      expect(routeRingPixel[3]).toBe(255)
      expect(routeRingPixel).toEqual(standaloneRingPixel)
    }

    for (const texture of [
      ...Object.values(standaloneTextures),
      ...Object.values(routeViaTextures),
    ]) {
      ;(texture as CanvasTexture | null)?.dispose()
    }
  } finally {
    Object.assign(globalThis, { document: previousDocument })
  }
})
