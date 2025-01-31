import jscad from "@jscad/modeling"
import type { AnySoupElement } from "@tscircuit/soup"
import { su } from "@tscircuit/soup-util"
import { Footprinter3d } from "jscad-electronics"
import { convertCSGToThreeGeom, createJSCADRenderer } from "jscad-fiber"
import { executeJscadOperations, jscadPlanner } from "jscad-planner"
import { JSDOM } from "jsdom"
import * as THREE from "three"
import { BufferGeometry, Float32BufferAttribute } from "three"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js"
import { createBoardGeomFromSoup } from "./soup-to-3d"
import { applyJsdomShim } from "./utils/jsdom-shim"

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

const { createJSCADRoot } = createJSCADRenderer(jscadPlanner as any)

function createGeometryFromPolygons(polygons: any[]) {
  const geometry = new BufferGeometry()
  const vertices: number[] = []
  const normals: number[] = []

  try {
    for (const polygon of polygons) {
      // Create triangles from polygon vertices
      for (let i = 1; i < polygon.vertices.length - 1; i++) {
        vertices.push(
          ...polygon.vertices[0], // First vertex
          ...polygon.vertices[i], // Second vertex
          ...polygon.vertices[i + 1], // Third vertex
        )

        // Add normal for each vertex of the triangle
        const v1 = new THREE.Vector3(...polygon.vertices[0])
        const v2 = new THREE.Vector3(...polygon.vertices[i])
        const v3 = new THREE.Vector3(...polygon.vertices[i + 1])
        const normal = new THREE.Vector3()
          .crossVectors(
            new THREE.Vector3().subVectors(v2, v1),
            new THREE.Vector3().subVectors(v3, v1),
          )
          .normalize()

        normals.push(
          normal.x,
          normal.y,
          normal.z,
          normal.x,
          normal.y,
          normal.z,
          normal.x,
          normal.y,
          normal.z,
        )
      }
    }

    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3))
    geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3))
    return geometry
  } catch (error) {
    console.error("Error creating geometry:", error)
    throw error
  }
}

async function loadModel(url: string): Promise<THREE.Object3D | null> {
  try {
    if (url.endsWith(".stl")) {
      const loader = new STLLoader()
      const geometry = await loader.loadAsync(url)
      const material = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.5,
        roughness: 0.5,
      })
      return new THREE.Mesh(geometry, material)
    } else if (url.endsWith(".obj")) {
      const loader = new OBJLoader()
      return await loader.loadAsync(url)
    }
    return null
  } catch (error) {
    console.error("Failed to load model:", error)
    return null
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

  // Setup camera for top view
  const camera = new THREE.OrthographicCamera(
    width / -2 / zoom,
    width / 2 / zoom,
    height / 2 / zoom,
    height / -2 / zoom,
    -1000,
    1000,
  )

  // Position camera directly above
  camera.position.set(0, 0, 100)
  camera.up.set(0, 1, 0)
  camera.lookAt(0, 0, 0)

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, Math.PI / 2)
  scene.add(ambientLight)
  const pointLight = new THREE.PointLight(0xffffff, Math.PI / 4)
  pointLight.position.set(-10, -10, 10)
  scene.add(pointLight)

  // Add components
  const components = su(circuitJson).cad_component.list()
  for (const component of components) {
    try {
      // Handle STL/OBJ models first
      const url = component.model_obj_url ?? component.model_stl_url
      if (url) {
        const model = await loadModel(url)
        if (model) {
          if (component.position) {
            model.position.set(
              component.position.x ?? 0,
              component.position.y ?? 0,
              (component.position.z ?? 0) + 0.5,
            )
          }
          if (component.rotation) {
            model.rotation.set(
              THREE.MathUtils.degToRad(component.rotation.x ?? 0),
              THREE.MathUtils.degToRad(component.rotation.y ?? 0),
              THREE.MathUtils.degToRad(component.rotation.z ?? 0),
            )
          }
          scene.add(model)
          continue
        }
      }

      // Handle JSCAD models
      if (component.model_jscad) {
        const jscadObject = executeJscadOperations(
          jscad as any,
          component.model_jscad,
        )
        const threeGeom = convertCSGToThreeGeom(jscadObject)
        const material = new THREE.MeshStandardMaterial({
          color: 0x888888,
          metalness: 0.5,
          roughness: 0.5,
          side: THREE.DoubleSide,
        })
        const mesh = new THREE.Mesh(threeGeom, material)

        if (component.position) {
          mesh.position.set(
            component.position.x ?? 0,
            component.position.y ?? 0,
            (component.position.z ?? 0) + 0.5,
          )
        }
        if (component.rotation) {
          mesh.rotation.set(
            THREE.MathUtils.degToRad(component.rotation.x ?? 0),
            THREE.MathUtils.degToRad(component.rotation.y ?? 0),
            THREE.MathUtils.degToRad(component.rotation.z ?? 0),
          )
        }
        scene.add(mesh)
        continue
      }

      // Handle footprints
      if (component.footprinter_string) {
        try {
          const jscadOperations: any[] = []
          const root = createJSCADRoot(jscadOperations)
          root.render(
            <Footprinter3d footprint={component.footprinter_string} />,
          )

          // Process each operation from the footprinter
          for (const operation of jscadOperations) {
            const jscadObject = executeJscadOperations(jscad as any, operation)
            const threeGeom = convertCSGToThreeGeom(jscadObject)
            const material = new THREE.MeshStandardMaterial({
              color: 0x444444, // Dark gray like in CadViewer
              metalness: 0.2,
              roughness: 0.8,
              side: THREE.DoubleSide,
            })
            const mesh = new THREE.Mesh(threeGeom, material)

            if (component.position) {
              mesh.position.set(
                component.position.x ?? 0,
                component.position.y ?? 0,
                (component.position.z ?? 0) + 0.5,
              )
            }
            if (component.rotation) {
              mesh.rotation.set(
                THREE.MathUtils.degToRad(component.rotation.x ?? 0),
                THREE.MathUtils.degToRad(component.rotation.y ?? 0),
                THREE.MathUtils.degToRad(component.rotation.z ?? 0),
              )
            }
            scene.add(mesh)
          }
        } catch (error) {
          console.error("Failed to create footprint geometry:", error)
        }
      }
    } catch (error) {
      console.error("Failed to create component:", error)

      // Add fallback box for failed components (like MixedStlModel does)
      const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
      const material = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.25,
      })
      const mesh = new THREE.Mesh(geometry, material)

      if (component.position) {
        mesh.position.set(
          component.position.x ?? 0,
          component.position.y ?? 0,
          (component.position.z ?? 0) + 0.5,
        )
      }
      scene.add(mesh)
    }
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
          opacity: 0.9, // Slightly more transparent
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

  // Add grid (matching CadViewerContainer)
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

  const svgString = new dom.window.XMLSerializer()
    .serializeToString(renderer.domElement)
    .replace(
      /xmlns="[^"]*"\s+xmlns="[^"]*"/,
      'xmlns="http://www.w3.org/2000/svg"',
    )

  return svgString
}
