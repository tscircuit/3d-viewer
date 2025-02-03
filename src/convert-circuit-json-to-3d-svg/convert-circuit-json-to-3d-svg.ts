import type { AnySoupElement } from "@tscircuit/soup"
import { su } from "@tscircuit/soup-util"
import Debug from "debug"
import * as THREE from "three"
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js"
import { createBoardGeomFromSoup } from "../soup-to-3d"
import { createGeometryFromPolygons } from "../utils/create-geometry-from-polygons"
import { renderComponent } from "../utils/render-component"
import { createCamera } from "./create-camera/create-camera"

interface CircuitToSvgOptions {
  width?: number
  height?: number
  /** perspective is an alternative/shorthand to the camera position and lookAt */
  perspective?: "angled" | "top" | "isometric-angled" | "front" | "side"
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

const log = Debug("tscircuit:3d-viewer:convert-circuit-json-to-3d-svg")

export async function convertCircuitJsonTo3dSvg(
  circuitJson: AnySoupElement[],
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
  const renderer = new SVGRenderer()
  renderer.setSize(width, height)
  renderer.setClearColor(new THREE.Color(backgroundColor), 1)

  // Create camera with explicit type and parameters
  const camera = createCamera({
    perspective: options.perspective,
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
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)
    }
  }

  // Add grid
  const gridHelper = new THREE.GridHelper(100, 100)
  gridHelper.rotation.x = Math.PI / 2
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
  ;(camera as any).updateProjectionMatrix()

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
