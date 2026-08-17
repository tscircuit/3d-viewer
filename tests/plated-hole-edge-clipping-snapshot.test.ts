import { expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { applyJsdomShim } from "../src/utils/jsdom-shim"
import * as THREE from "three"
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js"
import { BoardGeomBuilder } from "../src/BoardGeomBuilder"
import { createGeometryFromPolygons } from "../src/utils/create-geometry-from-polygons"
import Module from "manifold-3d"
import { processPlatedHolesForManifold } from "../src/utils/manifold/process-plated-holes"
import { createManifoldBoard } from "../src/utils/manifold/create-manifold-board"
import { manifoldMeshToThreeGeometry } from "../src/utils/manifold-mesh-to-three-geometry"
import { colors } from "../src/geoms/constants"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"

const dom = new JSDOM()
applyJsdomShim(dom)

const circuitJson: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board_0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    thickness: 1.4,
    material: "fr4",
    num_layers: 2,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "ph_top",
    shape: "circle",
    x: 0,
    y: 10,
    hole_diameter: 2,
    outer_diameter: 5,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "ph_bottom",
    shape: "circle",
    x: 0,
    y: -10,
    hole_diameter: 2,
    outer_diameter: 5,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "ph_left",
    shape: "circle",
    x: -10,
    y: 0,
    hole_diameter: 2,
    outer_diameter: 5,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "ph_right",
    shape: "circle",
    x: 10,
    y: 0,
    hole_diameter: 2,
    outer_diameter: 5,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "ph_corner",
    shape: "circle",
    x: 10,
    y: 10,
    hole_diameter: 2,
    outer_diameter: 5,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "ph_center",
    shape: "circle",
    x: 0,
    y: 0,
    hole_diameter: 2,
    outer_diameter: 5,
    layers: ["top", "bottom"],
  },
]

function renderSceneToSvg(scene: THREE.Scene): string {
  const width = 800
  const height = 600
  const renderer = new SVGRenderer()
  renderer.setSize(width, height)
  renderer.setClearColor(new THREE.Color("#ffffff"), 1)

  const camera = new THREE.OrthographicCamera()
  const aspect = width / height
  const zoom = 18
  const halfFrustum = 100 / 2 / zoom
  camera.left = -halfFrustum * aspect
  camera.right = halfFrustum * aspect
  camera.top = halfFrustum
  camera.bottom = -halfFrustum
  camera.near = -1000
  camera.far = 1000
  camera.position.set(0, 0, 100)
  camera.up.set(0, 1, 0)
  camera.lookAt(new THREE.Vector3(0, 0, 0))
  camera.updateProjectionMatrix()

  renderer.render(scene, camera)
  return new global.window.XMLSerializer().serializeToString(
    renderer.domElement,
  )
}

test("JSCAD: render board with edge plated holes to SVG snapshot", async () => {
  const builder = new BoardGeomBuilder(circuitJson, () => {})
  while (!builder.step(10)) {}
  const geoms = builder.getGeoms()

  const scene = new THREE.Scene()
  for (const g of geoms) {
    if (!g.polygons || g.polygons.length === 0) continue
    const geom = createGeometryFromPolygons(g.polygons)
    const color = g.color
      ? new THREE.Color(g.color[0], g.color[1], g.color[2])
      : new THREE.Color("#cb9f66")
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
    })
    scene.add(new THREE.Mesh(geom, mat))
  }

  const svg = renderSceneToSvg(scene)
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "plated-hole-edge-clipping-jscad",
  )
})

test("Manifold: render board with edge plated holes to SVG snapshot", async () => {
  const wasm = await Module()
  wasm.setup()
  const Manifold = wasm.Manifold
  const CrossSection = wasm.CrossSection

  const boardData: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "board_0",
    center: { x: 0, y: 0 },
    width: 20,
    height: 20,
    thickness: 1.4,
    material: "fr4",
    num_layers: 2,
  }
  const pcbThickness = 1.4
  const clipThickness = pcbThickness + 2
  const { boardOp: initialBoardOp } = createManifoldBoard(
    Manifold,
    CrossSection,
    boardData,
    pcbThickness,
    [],
  )
  const clipCube = Manifold.cube([20, 20, clipThickness], true)
  const cleanup = [clipCube]

  const phResult = processPlatedHolesForManifold(
    Manifold,
    CrossSection,
    circuitJson,
    pcbThickness,
    cleanup,
    clipCube,
  )
  const holeUnion = Manifold.union(phResult.platedHoleBoardDrills)
  const totalSubtractionOps = phResult.platedHoleSubtractOp
    ? Manifold.union([holeUnion, phResult.platedHoleSubtractOp])
    : holeUnion
  const boardOp = initialBoardOp.subtract(totalSubtractionOps)
  const cutPlatedCopper = phResult.platedHoleSubtractOp.subtract(holeUnion)

  const scene = new THREE.Scene()
  const boardMesh = boardOp.getMesh()
  const boardGeom = manifoldMeshToThreeGeometry(boardMesh)
  const boardMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(
      colors.fr4Tan[0],
      colors.fr4Tan[1],
      colors.fr4Tan[2],
    ),
    side: THREE.DoubleSide,
  })
  scene.add(new THREE.Mesh(boardGeom, boardMat))

  const copperMesh = cutPlatedCopper.getMesh()
  const copperGeom = manifoldMeshToThreeGeometry(copperMesh)
  const copperMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(
      colors.copper[0],
      colors.copper[1],
      colors.copper[2],
    ),
    side: THREE.DoubleSide,
  })
  scene.add(new THREE.Mesh(copperGeom, copperMat))

  const svg = renderSceneToSvg(scene)
  expect(svg).toMatchSvgSnapshot(
    import.meta.path,
    "plated-hole-edge-clipping-manifold",
  )
})
