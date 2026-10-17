import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbPanel } from "circuit-json"
import * as THREE from "three"
import { STLExporter } from "three-stdlib"
import { BoardGeomBuilder } from "./BoardGeomBuilder"
import { createSimplifiedBoardGeom } from "./soup-to-3d"
import { createCadCableObject, getCadCables } from "./three-components/CadCable"
import { createBoardMaterial } from "./utils/create-board-material"
import { createGeometryFromPolygons } from "./utils/create-geometry-from-polygons"
import { getBoardEdgeColor } from "./utils/get-board-edge-color"
import { renderComponent } from "./utils/render-component"

export interface ConvertCircuitJsonToStlOptions {
  binary?: boolean
  includeBoard?: boolean
  includeComponents?: boolean
  includeCables?: boolean
  useDetailedBoard?: boolean
}

export function combineModelsToStl(
  models: THREE.Object3D | THREE.Object3D[],
  options?: { binary?: false },
): string
export function combineModelsToStl(
  models: THREE.Object3D | THREE.Object3D[],
  options: { binary: true },
): ArrayBuffer
export function combineModelsToStl(
  models: THREE.Object3D | THREE.Object3D[],
  options?: { binary?: boolean },
): string | ArrayBuffer
export function combineModelsToStl(
  models: THREE.Object3D | THREE.Object3D[],
  options: { binary?: boolean } = {},
): string | ArrayBuffer {
  const root = new THREE.Group()
  const modelList = Array.isArray(models) ? models : [models]

  for (const model of modelList) {
    model.updateMatrixWorld(true)
    root.add(model.clone(true))
  }

  root.updateMatrixWorld(true)

  const exporter = new STLExporter()

  if (options.binary) {
    const result = exporter.parse(root, { binary: true })
    const bytes = new Uint8Array(
      result.buffer,
      result.byteOffset,
      result.byteLength,
    )
    const buffer = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(buffer).set(bytes)
    return buffer
  }

  return exporter.parse(root, { binary: false })
}

export async function convertCircuitJsonToStl(
  circuitJson: AnyCircuitElement[],
  options?: ConvertCircuitJsonToStlOptions & { binary?: false },
): Promise<string>
export async function convertCircuitJsonToStl(
  circuitJson: AnyCircuitElement[],
  options: ConvertCircuitJsonToStlOptions & { binary: true },
): Promise<ArrayBuffer>
export async function convertCircuitJsonToStl(
  circuitJson: AnyCircuitElement[],
  options?: ConvertCircuitJsonToStlOptions,
): Promise<string | ArrayBuffer>
export async function convertCircuitJsonToStl(
  circuitJson: AnyCircuitElement[],
  options: ConvertCircuitJsonToStlOptions = {},
): Promise<string | ArrayBuffer> {
  const {
    binary = false,
    includeBoard = true,
    includeComponents = true,
    includeCables = true,
    useDetailedBoard = true,
  } = options

  const scene = new THREE.Scene()

  if (includeComponents) {
    const components = su(circuitJson).cad_component.list()
    for (const component of components) {
      await renderComponent(component, scene)
    }
  }

  if (includeCables) {
    for (const cable of getCadCables(circuitJson)) {
      try {
        scene.add(createCadCableObject(cable))
      } catch {
        // Ignore invalid cable geometry during STL export
      }
    }
  }

  if (includeBoard) {
    const boards = su(circuitJson).pcb_board.list()
    const firstPanel = circuitJson.find(
      (element): element is PcbPanel => element.type === "pcb_panel",
    )
    const boardData = firstPanel
      ? boards.find((board) => board.pcb_panel_id === firstPanel.pcb_panel_id)
      : boards.find((board) => !board.pcb_panel_id)

    const hasBoardOrPanel = Boolean(firstPanel || boardData)
    let boardGeoms = hasBoardOrPanel
      ? createSimplifiedBoardGeom(circuitJson)
      : []

    if (hasBoardOrPanel && useDetailedBoard) {
      try {
        const builder = new BoardGeomBuilder(circuitJson, () => {})
        while (!builder.step(10)) {
          // Process synchronously until finished
        }
        const detailedGeoms = builder.getGeoms()
        if (detailedGeoms.length > 0) {
          boardGeoms = detailedGeoms
        }
      } catch {
        // Fall back to simplified board geometry if detailed builder fails
      }
    }

    if (boardGeoms.length > 0) {
      const edgeColor = getBoardEdgeColor({
        material: boardData?.material ?? "fr4",
        solder_mask_color: boardData?.solder_mask_color,
      })

      for (const geom of boardGeoms) {
        const g = geom as any
        if (!g.polygons || g.polygons.length === 0) continue
        const geometry = createGeometryFromPolygons(g.polygons)
        const material = createBoardMaterial({
          material: boardData?.material,
          color: edgeColor,
          side: THREE.DoubleSide,
        })
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)
      }
    }
  }

  return combineModelsToStl(scene, { binary })
}
