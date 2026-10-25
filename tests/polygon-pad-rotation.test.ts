import { expect, test } from "bun:test"
import { geom3 } from "@jscad/modeling/src/geometries"
import { createCanvas, loadImage } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { JSDOM } from "jsdom"
import ManifoldModule from "manifold-3d"
import * as THREE from "three"
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js"
import { BoardGeomBuilder } from "../src/BoardGeomBuilder"
import { createCombinedBoardTextures } from "../src/textures/create-combined-board-textures"
import { createGeometryFromPolygons } from "../src/utils/create-geometry-from-polygons"
import { applyJsdomShim } from "../src/utils/jsdom-shim"
import { manifoldMeshToThreeGeometry } from "../src/utils/manifold-mesh-to-three-geometry"
import { createManifoldBoard } from "../src/utils/manifold/create-manifold-board"
import { processPlatedHolesForManifold } from "../src/utils/manifold/process-plated-holes"
import { calculateOutlineBounds } from "../src/utils/outline-bounds"
import {
  Unrotated,
  Rotated90Degrees,
  Rotated37Degrees,
} from "../stories/JaeUsbPolygonPads.stories"

test("JAE polygon pads at 0°, 90°, and 37° preserve rotation and open drills", async () => {
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  const dom = new JSDOM()
  applyJsdomShim(dom)
  const createElement = document.createElement.bind(document)
  Object.assign(document, {
    createElement: (tag: string) =>
      tag === "canvas" ? createCanvas(1, 1) : createElement(tag),
  })
  const panels: string[] = []
  const drillAlphas: number[] = []
  const addPanel = (
    column: number,
    row: number,
    title: string,
    image: string,
  ) =>
    panels.push(`<g transform="translate(${column * 340} ${row * 360})">
      <text x="10" y="22" font-family="monospace" font-size="16">${title}</text>
      <rect x="10" y="32" width="320" height="320" fill="url(#checker)"/>
      <image x="10" y="32" width="320" height="320" href="${image}"/>
    </g>`)
  const renderer = new SVGRenderer()
  renderer.setSize(320, 320)
  renderer.setPrecision(3)
  const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100)
  camera.position.set(0, 0, 20)
  camera.lookAt(0, 0, 0)

  const captureGeometry = async (
    geometries: THREE.BufferGeometry[],
    column: number,
    row: number,
    title: string,
  ) => {
    const scene = new THREE.Scene()
    const materials = geometries.map((geometry, index) => {
      const material = new THREE.MeshBasicMaterial({
        color: index === 0 ? 0x28503d : 0xc7a164,
        transparent: index === 0,
        opacity: index === 0 ? 0.15 : 1,
        side: THREE.DoubleSide,
      })
      scene.add(new THREE.Mesh(geometry, material))
      return material
    })
    try {
      renderer.render(scene, camera)
      renderer.domElement.style.removeProperty("background-color")
      const svg = new dom.window.XMLSerializer().serializeToString(
        renderer.domElement,
      )
      const canvas = createCanvas(320, 320)
      canvas.getContext("2d").drawImage(await loadImage(Buffer.from(svg)), 0, 0)
      addPanel(column, row, title, canvas.toDataURL("image/png"))
    } finally {
      for (const geometry of geometries) geometry.dispose()
      for (const material of materials) material.dispose()
    }
  }

  try {
    const manifold = await ManifoldModule()
    manifold.setup()
    const { Manifold, CrossSection } = manifold
    const stories = [
      { rotation: 0, story: Unrotated },
      { rotation: 90, story: Rotated90Degrees },
      { rotation: 37, story: Rotated37Degrees },
    ]
    for (const [column, { rotation, story }] of stories.entries()) {
      const circuit: AnyCircuitElement[] = story().props.circuitJson
      const board = circuit.find((element) => element.type === "pcb_board")!
      const builder = new BoardGeomBuilder(circuit, () => {})
      while (!builder.step(100)) {}
      await captureGeometry(
        builder
          .getGeoms()
          .map((geometry) =>
            createGeometryFromPolygons(geom3.toPolygons(geometry)),
          ),
        column,
        0,
        `JSCAD · ${rotation}°`,
      )

      const cleanup: { delete(): void }[] = []
      try {
        const { boardOp } = createManifoldBoard(
          Manifold,
          CrossSection,
          board,
          board.thickness!,
          cleanup,
        )
        const holes = processPlatedHolesForManifold(
          Manifold,
          CrossSection,
          circuit,
          board.thickness!,
          cleanup,
        )
        for (const { geometry } of holes.platedHoleCopperGeoms)
          geometry.dispose()
        const drills = Manifold.union(holes.platedHoleBoardDrills)
        const subtraction = Manifold.union([drills, holes.platedHoleSubtractOp])
        const drilledBoard = boardOp.subtract(subtraction)
        const drilledCopper = holes.platedHoleSubtractOp.subtract(drills)
        cleanup.push(drills, subtraction, drilledBoard, drilledCopper)
        await captureGeometry(
          [drilledBoard, drilledCopper].map((solid) =>
            manifoldMeshToThreeGeometry(solid.getMesh()),
          ),
          column,
          1,
          `Manifold · ${rotation}°`,
        )
      } finally {
        for (const solid of new Set(cleanup)) solid.delete()
      }

      const bounds = calculateOutlineBounds(board)
      const resolution = 50
      const textures = createCombinedBoardTextures({
        circuitJson: circuit,
        boardData: board,
        traceTextureResolution: resolution,
      })
      try {
        for (const [row, layer] of (["top", "bottom"] as const).entries()) {
          const canvas = (
            layer === "top" ? textures.topBoard : textures.bottomBoard
          )!.image
          addPanel(
            column,
            row + 2,
            `${layer} surface · ${rotation}°`,
            canvas.toDataURL("image/png"),
          )
          for (const hole of circuit.filter(
            (element) => element.type === "pcb_plated_hole",
          )) {
            drillAlphas.push(
              canvas
                .getContext("2d")
                .getImageData(
                  Math.floor((hole.x - bounds.minX) * resolution),
                  Math.floor(
                    (layer === "top"
                      ? bounds.maxY - hole.y
                      : hole.y - bounds.minY) * resolution,
                  ),
                  1,
                  1,
                ).data[3],
            )
          }
        }
      } finally {
        for (const texture of Object.values(textures)) texture?.dispose()
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1020" height="1440" viewBox="0 0 1020 1440">
      <defs><pattern id="checker" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="#ffffff"/><path d="M0 0h8v8H0zM8 8h8v8H8z" fill="#d8dde3"/>
      </pattern></defs><rect width="1020" height="1440" fill="white"/>
      ${panels.join("\n")}
    </svg>`
    await expect(svg).toMatchSvgSnapshot(import.meta.path)
    expect(drillAlphas.every((alpha) => alpha === 0)).toBe(true)
  } finally {
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
    })
    dom.window.close()
  }
}, 30_000)
