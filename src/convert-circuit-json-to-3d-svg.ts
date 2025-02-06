import { su } from "@tscircuit/soup-util"
import type { AnyCircuitElement } from "circuit-json"
import Debug from "debug"
import * as THREE from "three"
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js"
import { createBoardGeomFromSoup } from "./soup-to-3d"
import { createGeometryFromPolygons } from "./utils/create-geometry-from-polygons"
import { renderComponent } from "./utils/render-component"

interface CircuitToSvgOptions {
  width?: number
  height?: number
  backgroundColor?: string
  padding?: number
}

const log = Debug("tscircuit:3d-viewer:convert-circuit-json-to-3d-svg")

export async function convertCircuitJsonTo3dSvg(
  circuitJson: AnyCircuitElement[],
  options: CircuitToSvgOptions = {},
): Promise<string> {
  const {
    width = 800,
    height = 800,
    backgroundColor = "#ffffff",
    padding = 20,
  } = options

  // Initialize scene and renderer with high precision but normal size
  const scene = new THREE.Scene()
  scene.up.set(0, 0, 1)
  const renderer = new SVGRenderer()
  renderer.setSize(width, height) // Back to normal size
  renderer.setClearColor(new THREE.Color(backgroundColor), 1)
  renderer.setQuality("hight")
  renderer.setPrecision(1)

  // Create perspective camera with optimal settings
  const fov = 45
  const aspect = width / height
  const near = 0.1
  const far = 50
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)

  // Match CadViewerContainer lighting exactly
  const ambientLight = new THREE.AmbientLight(0xffffff, Math.PI / 2)
  scene.add(ambientLight)

  const pointLight = new THREE.PointLight(0xffffff, Math.PI / 4, 0)
  pointLight.position.set(-10, -10, 10)
  scene.add(pointLight)

  // Add components
  const components = su(circuitJson).cad_component.list()
  for (const component of components) {
    await renderComponent(component, scene)
  }

  // Add board geometry after components
  const boardGeom = createBoardGeomFromSoup(circuitJson)
  if (boardGeom) {
    for (const geom of boardGeom) {
      const geometry = createGeometryFromPolygons(geom.polygons)
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(
          geom.color?.[0] ?? 0,
          geom.color?.[1] ?? 0,
          geom.color?.[2] ?? 0,
        ),
        metalness: 0.1,
        roughness: 0.8,
        opacity: 0.9,
        transparent: true,
        side: THREE.FrontSide,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.renderOrder = -10
      scene.add(mesh)
    }
  }

  // First get the board dimensions
  const board = circuitJson.find((c) => c.type === "pcb_board")
  // Use board size to set up proper view
  const boardWidth = board?.width || 10
  const boardHeight = board?.height || 10

  // Top view
  // camera.position.set(0, 0, 5)
  // camera.up.set(0, 0, 1)
  // camera.lookAt(new THREE.Vector3(0, 0, 0))

  // Position camera
  camera.position.set(5, 5, 5)
  camera.up.set(0, 0, 1)
  camera.lookAt(new THREE.Vector3(0, 0, 0))

  // Scale scene to fit view
  const maxDim = Math.max(boardWidth, boardHeight)
  const scale = (1.0 - padding / 100) / maxDim
  scene.scale.multiplyScalar(scale * 5)

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
