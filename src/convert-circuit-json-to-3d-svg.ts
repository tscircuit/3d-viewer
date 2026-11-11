import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbPanel } from "circuit-json"
import Debug from "debug"
import * as THREE from "three"
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js"
import { createSimplifiedBoardGeom } from "./soup-to-3d"
import { createCadCableObject, getCadCables } from "./three-components/CadCable"
import { createBoardMaterial } from "./utils/create-board-material"
import { createGeometryFromPolygons } from "./utils/create-geometry-from-polygons"
import { getBoardEdgeColor } from "./utils/get-board-edge-color"
import { renderComponent } from "./utils/render-component"

export type CameraPerspective =
  | "angled"
  | "top"
  | "front"
  | "side"
  | "isometric-angled"
  | "isometric-top"
  | "isometric-front"
  | "isometric-side"

export interface CircuitToSvgOptions {
  width?: number
  height?: number
  viewAngle?: "top" | "isometric" | "front" | "side"
  perspective?: CameraPerspective
  backgroundColor?: string
  padding?: number
  zoom?: number
  camera?: {
    position: {
      x: number
      y: number
      z: number
    }
    lookAt?: {
      x: number
      y: number
      z: number
    }
  }
}

const getDefaultCameraPosition = (
  perspective: CameraPerspective | undefined,
): { x: number; y: number; z: number } => {
  switch (perspective) {
    case "top":
    case "isometric-top":
      return { x: 0, y: 0, z: 100 }
    case "front":
      return { x: 0, y: -10, z: 0 }
    case "isometric-front":
      return { x: 0, y: -100, z: 0 }
    case "side":
      return { x: 10, y: 0, z: 0 }
    case "isometric-side":
      return { x: 100, y: 0, z: 0 }
    default:
      return { x: 10, y: 10, z: 10 }
  }
}

export const createCamera = (options: {
  perspective?: CameraPerspective
  camera?: {
    position: {
      x: number
      y: number
      z: number
    }
    lookAt?: {
      x: number
      y: number
      z: number
    }
  }
  screenSize: {
    width: number
    height: number
  }
  zoom?: number
}): THREE.OrthographicCamera | THREE.PerspectiveCamera => {
  const aspect = options.screenSize.width / options.screenSize.height
  const lookAt = options.camera?.lookAt ?? { x: 0, y: 0, z: 0 }

  if (options.perspective?.includes("isometric")) {
    const camera = new THREE.OrthographicCamera()
    const frustumSize = 100
    const halfFrustumSize = frustumSize / 2 / (options.zoom ?? 1)

    camera.left = -halfFrustumSize * aspect
    camera.right = halfFrustumSize * aspect
    camera.top = halfFrustumSize
    camera.bottom = -halfFrustumSize
    camera.near = -1000
    camera.far = 1000

    const position =
      options.camera?.position ?? getDefaultCameraPosition(options.perspective)
    camera.position.set(position.x, position.y, position.z)

    camera.lookAt(new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z))
    camera.up.set(0, 0, 1)
    camera.updateProjectionMatrix()

    return camera
  }

  const camera = new THREE.PerspectiveCamera()
  camera.aspect = aspect

  const position =
    options.camera?.position ?? getDefaultCameraPosition(options.perspective)
  camera.position.set(position.x, position.y, position.z)

  if (position.x !== lookAt.x || position.y !== lookAt.y) {
    camera.up.set(0, 0, 1)
  }
  camera.lookAt(new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z))
  camera.up.set(0, 0, 1)

  camera.updateProjectionMatrix()

  return camera
}

const resolvePerspective = (
  options: CircuitToSvgOptions,
): CameraPerspective => {
  if (options.perspective) {
    return options.perspective
  }
  switch (options.viewAngle) {
    case "top":
      return "isometric-top"
    case "front":
      return "isometric-front"
    case "side":
      return "isometric-side"
    case "isometric":
      return "isometric-angled"
  }
  if (options.camera && options.zoom !== undefined) {
    return "isometric-angled"
  }
  return "angled"
}

const log = Debug("tscircuit:3d-viewer:convert-circuit-json-to-3d-svg")

export async function convertCircuitJsonTo3dSvg(
  circuitJson: AnyCircuitElement[],
  options: CircuitToSvgOptions = {},
): Promise<string> {
  const {
    width = 800,
    height = 600,
    backgroundColor = "#ffffff",
    padding = 20,
    zoom = 1.5,
  } = options

  // Initialize scene and renderer
  const scene = new THREE.Scene()
  scene.up.set(0, 0, 1)
  const renderer = new SVGRenderer()
  renderer.setSize(width, height)
  renderer.setClearColor(new THREE.Color(backgroundColor), 1)

  const camera = createCamera({
    perspective: resolvePerspective(options),
    camera: options.camera,
    screenSize: { width, height },
    zoom,
  })

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, Math.PI / 2)
  scene.add(ambientLight)
  const pointLight = new THREE.PointLight(0xffffff, Math.PI / 4)
  pointLight.position.set(-10, -10, 10)
  scene.add(pointLight)

  // Add components
  const components = su(circuitJson).cad_component.list()
  for (const component of components) {
    await renderComponent(component, scene)
  }

  for (const cable of getCadCables(circuitJson)) {
    try {
      scene.add(createCadCableObject(cable))
    } catch (error) {
      log(`Failed to render CAD cable ${cable.cad_cable_id}`, error)
    }
  }

  const boards = su(circuitJson).pcb_board.list()
  const firstPanel = circuitJson.find(
    (circuitElement): circuitElement is PcbPanel =>
      circuitElement.type === "pcb_panel",
  )
  const boardData = firstPanel
    ? boards.find((board) => board.pcb_panel_id === firstPanel.pcb_panel_id)
    : boards.find((board) => !board.pcb_panel_id)

  // Add board geometry after components
  const boardGeom = createSimplifiedBoardGeom(circuitJson)
  if (boardGeom) {
    const edgeColor = getBoardEdgeColor({
      material: boardData?.material ?? "fr4",
      solder_mask_color: boardData?.solder_mask_color,
    })

    for (const geom of boardGeom) {
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

  // Add grid with thin lines and low opacity
  const gridColor = new THREE.Color(0x888888)
  const gridHelper = new THREE.GridHelper(100, 100, gridColor, gridColor)
  gridHelper.rotation.x = Math.PI / 2
  // Set grid material to have low opacity and proper color
  const materials = Array.isArray(gridHelper.material)
    ? gridHelper.material
    : [gridHelper.material]
  for (const mat of materials) {
    mat.transparent = true
    mat.opacity = 0.3
    if (mat instanceof THREE.LineBasicMaterial) {
      mat.color = gridColor
      mat.vertexColors = false
    }
  }
  scene.add(gridHelper)

  // Center and scale scene
  const box = new THREE.Box3().setFromObject(scene)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())

  scene.position.sub(center)

  const maxDim = Math.max(size.x, size.y, size.z)
  if (maxDim > 0) {
    const scale = (1.0 - padding / 100) / maxDim
    scene.scale.multiplyScalar(scale * 100)
  }
  // Before rendering, ensure camera is updated
  camera.updateProjectionMatrix()

  // Render and return SVG with additional checks
  renderer.render(scene, camera)

  const serialized = new global.window.XMLSerializer()
    .serializeToString(renderer.domElement)
    .replace(
      /xmlns="[^"]*"\s+xmlns="[^"]*"/,
      'xmlns="http://www.w3.org/2000/svg"',
    )

  return serialized
}
