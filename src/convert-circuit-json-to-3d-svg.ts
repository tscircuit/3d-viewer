import type { AnySoupElement } from "@tscircuit/soup"
import { su } from "@tscircuit/soup-util"
import Debug from "debug"
import { JSDOM } from "jsdom"
import * as THREE from "three"
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js"
import { createBoardGeomFromSoup } from "./soup-to-3d"
import { createGeometryFromPolygons } from "./utils/create-geometry-from-polygons"
import { applyJsdomShim } from "./utils/jsdom-shim"
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

const log = Debug("tscircuit:3d-viewer:convert-circuit-json-to-3d-svg")

export async function convertCircuitJsonTo3dSvg(
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

  // Create camera with explicit type and parameters
  const camera = new THREE.OrthographicCamera()

  // Set camera properties
  const aspect = width / height
  const frustumSize = 100
  const halfFrustumSize = frustumSize / 2 / zoom

  log("Three.js version:", THREE.REVISION)
  log("Camera prototype checks:", {
    directInstanceOf: camera instanceof THREE.Camera,
    directInstanceOfOrthographic: camera instanceof THREE.OrthographicCamera,
    constructorName: camera.constructor.name,
    cameraPrototype: Object.getPrototypeOf(camera),
    threeCamera: THREE.Camera,
    threeOrthographicCamera: THREE.OrthographicCamera,
  })

  // Set camera properties
  camera.left = -halfFrustumSize * aspect
  camera.right = halfFrustumSize * aspect
  camera.top = halfFrustumSize
  camera.bottom = -halfFrustumSize
  camera.near = -1000
  camera.far = 1000

  log("Camera frustum:", {
    left: camera.left,
    right: camera.right,
    top: camera.top,
    bottom: camera.bottom,
    near: camera.near,
    far: camera.far,
  })

  // Set camera position
  const position = options.camera?.position ?? { x: 0, y: 0, z: 100 }
  camera.position.set(position.x, position.y, position.z)

  // Set camera up vector
  camera.up.set(0, 1, 0)

  // Set camera look at
  const lookAt = options.camera?.lookAt ?? { x: 0, y: 0, z: 0 }
  camera.lookAt(new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z))

  // Important: Update the camera matrix
  camera.updateProjectionMatrix()

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

  log("Three.js version:", THREE.REVISION)
  log("Camera prototype checks:", {
    directInstanceOf: camera instanceof THREE.Camera,
    directInstanceOfOrthographic: camera instanceof THREE.OrthographicCamera,
    constructorName: camera.constructor.name,
    cameraPrototype: Object.getPrototypeOf(camera),
    threeCamera: THREE.Camera,
    threeOrthographicCamera: THREE.OrthographicCamera,
  })

  // Before rendering, ensure camera is updated
  camera.updateProjectionMatrix()

  log("Renderer prototype checks:", {
    rendererThreeVersion: THREE.REVISION,
    cameraConstructor: camera.constructor,
    rendererPrototype: Object.getPrototypeOf(renderer).constructor.name,
    rendererThreeImport: renderer.constructor.toString(),
    cameraThreeImport: camera.constructor.toString(),
    svgRendererPath: require.resolve(
      "three/examples/jsm/renderers/SVGRenderer.js",
    ),
    threePath: require.resolve("three"),
  })

  // Render and return SVG with additional checks
  renderer.render(scene, camera)

  const serialized = new dom.window.XMLSerializer()
    .serializeToString(renderer.domElement)
    .replace(
      /xmlns="[^"]*"\s+xmlns="[^"]*"/,
      'xmlns="http://www.w3.org/2000/svg"',
    )
    
  return serialized
}
