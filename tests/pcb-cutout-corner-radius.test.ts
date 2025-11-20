import { expect, test } from "bun:test"
import ManifoldModule from "manifold-3d"
import { BoardGeomBuilder } from "../src/BoardGeomBuilder"
import { processCutoutsForManifold } from "../src/utils/manifold/process-cutouts"

const baseBoard = {
  type: "pcb_board" as const,
  pcb_board_id: "board_0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  num_layers: 2,
  thickness: 1.2,
  material: "fr4" as const,
}

const baseCutout = {
  type: "pcb_cutout" as const,
  pcb_cutout_id: "cutout_0",
  shape: "rect" as const,
  center: { x: 0, y: 0 },
  width: 10,
  height: 6,
}

const buildBoardPolygonCount = (cornerRadius?: number) => {
  const builder = new BoardGeomBuilder(
    [
      { ...baseBoard },
      {
        ...baseCutout,
        corner_radius: cornerRadius,
      },
    ],
    () => {},
  )

  while (!builder.step(50)) {
    // keep stepping until complete
  }

  const boardGeom = builder.getGeoms()[0]
  return boardGeom?.polygons?.length ?? 0
}

test("jscad cutouts support corner_radius for rectangular shapes", () => {
  const sharpPolygons = buildBoardPolygonCount(0)
  const roundedPolygons = buildBoardPolygonCount(1)

  expect(roundedPolygons).toBeGreaterThan(sharpPolygons)
})

test("manifold cutouts use rounded prisms when corner_radius is present", async () => {
  const manifoldModule = await ManifoldModule()
  manifoldModule.setup()
  const { Manifold, CrossSection } = manifoldModule

  const buildCutoutMeshSize = async (cornerRadius?: number) => {
    const cleanup: any[] = []
    const { cutoutOps } = processCutoutsForManifold(
      Manifold,
      CrossSection,
      [
        {
          ...baseCutout,
          corner_radius: cornerRadius,
        },
      ],
      baseBoard.thickness,
      cleanup,
    )

    const mesh = cutoutOps[0]!.getMesh()
    const size = mesh.triVerts.length

    const uniqueCleanup = new Set(cleanup)
    uniqueCleanup.forEach((instance) => {
      if (instance && typeof instance.delete === "function") {
        instance.delete()
      }
    })

    return size
  }

  const sharpSize = await buildCutoutMeshSize(0)
  const roundedSize = await buildCutoutMeshSize(1)

  expect(roundedSize).toBeGreaterThan(sharpSize)
})
