import type { AnySoupElement } from "@tscircuit/soup"
import { su } from "@tscircuit/soup-util"
import { JSDOM } from "jsdom"
import * as THREE from "three"
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js"
import { createBoardGeomFromSoup } from "./soup-to-3d"
import { applyJsdomShim } from "./utils/jsdom-shim"
import { createGeometryFromPolygons } from "./utils/create-geometry-from-polygons"
import { renderComponent } from "./utils/render-component"

interface CircuitToSvgOptions {
  width?: number
  height?: number
  viewAngle?: "top" | "isometric" | "front" | "side"
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

export async function convert3dCircuitToSvg(
  circuitJson: AnySoupElement[],
  options: CircuitToSvgOptions = {},
): Promise<string> {
  const dom = new JSDOM()
  applyJsdomShim(dom)

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

  // Setup camera based on options
  const camera = new THREE.OrthographicCamera(
    width / -2 / zoom,
    width / 2 / zoom,
    height / 2 / zoom,
    height / -2 / zoom,
    -1000,
    1000,
  )

  if (options.camera?.position) {
    camera.position.set(
      options.camera.position.x,
      options.camera.position.y,
      options.camera.position.z,
    )
  } else {
    camera.position.set(0, 0, 100)
  }

  camera.up.set(0, 1, 0)

  if (options.camera?.lookAt) {
    camera.lookAt(
      options.camera.lookAt.x,
      options.camera.lookAt.y,
      options.camera.lookAt.z,
    )
  } else {
    camera.lookAt(0, 0, 0)
  }

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
      try {
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
      } catch (error) {
        console.error("Failed to create board geometry:", error)
      }
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

  // Render and return SVG
  renderer.render(scene, camera)

  return new dom.window.XMLSerializer()
    .serializeToString(renderer.domElement)
    .replace(
      /xmlns="[^"]*"\s+xmlns="[^"]*"/,
      'xmlns="http://www.w3.org/2000/svg"',
    )
}
