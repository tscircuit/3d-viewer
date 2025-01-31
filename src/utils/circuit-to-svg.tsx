import type { AnySoupElement } from "@tscircuit/soup"
import { su } from "@tscircuit/soup-util"
import { Footprinter3d } from "jscad-electronics"
import { createJSCADRenderer } from "jscad-fiber"
import { jscadPlanner } from "jscad-planner"
import { JSDOM } from "jsdom"
import * as THREE from "three"
import { BufferGeometry, Float32BufferAttribute } from "three"
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js"
import { createBoardGeomFromSoup } from "../soup-to-3d"

interface CircuitToSvgOptions {
  width?: number
  height?: number
  viewAngle?: "top" | "isometric" | "front" | "side"
  backgroundColor?: string
  padding?: number
  zoom?: number
}

// Setup JSDOM and globals needed for THREE.js
const dom = new JSDOM()
global.document = dom.window.document
global.window = dom.window as any
global.navigator = dom.window.navigator
global.Element = dom.window.Element
global.HTMLElement = dom.window.HTMLElement

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
          ...polygon.vertices[0],    // First vertex
          ...polygon.vertices[i],    // Second vertex
          ...polygon.vertices[i + 1] // Third vertex
        )

        // Add normal for each vertex of the triangle
        const v1 = new THREE.Vector3(...polygon.vertices[0])
        const v2 = new THREE.Vector3(...polygon.vertices[i])
        const v3 = new THREE.Vector3(...polygon.vertices[i + 1])
        const normal = new THREE.Vector3()
          .crossVectors(
            new THREE.Vector3().subVectors(v2, v1),
            new THREE.Vector3().subVectors(v3, v1)
          )
          .normalize()
        
        normals.push(
          normal.x, normal.y, normal.z,
          normal.x, normal.y, normal.z,
          normal.x, normal.y, normal.z
        )
      }
    }

    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
    return geometry
  } catch (error) {
    console.error('Error creating geometry:', error)
    throw error
  }
}

export async function circuitToSvg(
  circuitJson: AnySoupElement[],
  options: CircuitToSvgOptions = {}
): Promise<string> {
  const {
    width = 800,
    height = 600,
    viewAngle = "top",
    backgroundColor = "#ffffff",
    padding = 20,
    zoom = 1.5
  } = options

  try {
    // Initialize scene and renderer
    const scene = new THREE.Scene()
    const renderer = new SVGRenderer()
    renderer.setSize(width, height)
    renderer.setClearColor(backgroundColor)

    // Setup camera for top view (matching CadViewer's perspective)
    const camera = new THREE.OrthographicCamera(
      width / -2 / zoom,   // Left
      width / 2 / zoom,    // Right
      height / 2 / zoom,   // Top
      height / -2 / zoom,  // Bottom
      0.1,                 // Near
      1000                 // Far
    )
    camera.position.set(0, 0, 50)
    camera.up.set(0, 0, 1)
    camera.lookAt(0, 0, 0)

    // Add lighting (matching CadViewer's setup)
    const ambientLight = new THREE.AmbientLight(0xffffff, Math.PI / 2)
    scene.add(ambientLight)
    const pointLight = new THREE.PointLight(0xffffff, Math.PI / 4)
    pointLight.position.set(-10, -10, 10)
    scene.add(pointLight)

    // Add board geometry with error handling
    const boardGeom = createBoardGeomFromSoup(circuitJson)
    if (boardGeom) {
      for (const geom of boardGeom) {
        try {
          const geometry = createGeometryFromPolygons(geom.polygons)
          
          const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(
              geom.color[0],
              geom.color[1],
              geom.color[2]
            ),
            metalness: 0.1,
            roughness: 0.8,
            opacity: 0.95,
            transparent: true,
            side: THREE.DoubleSide
          })

          const mesh = new THREE.Mesh(geometry, material)
          
          // Apply transforms if present
          if (geom.transforms) {
            const matrix = new THREE.Matrix4()
            matrix.fromArray(geom.transforms)
            mesh.applyMatrix4(matrix)
          }
          
          scene.add(mesh)
        } catch (error) {
          console.error('Failed to create board geometry:', error)
        }
      }
    }

    // Add components using same approach as FootprinterModel
    const components = su(circuitJson).cad_component.list()
    for (const component of components) {
      if (component.footprinter_string) {
        const jscadOperations: any[] = []
        const root = createJSCADRoot(jscadOperations)
        root.render(<Footprinter3d footprint={component.footprinter_string} />)

        for (const operation of jscadOperations) {
          try {
            const geometry = createGeometryFromPolygons(operation.polygons)
            const material = new THREE.MeshStandardMaterial({
              color: 0x888888,
              metalness: 0.5,
              roughness: 0.5,
              side: THREE.DoubleSide
            })

            const mesh = new THREE.Mesh(geometry, material)
            
            // Position and rotate component
            if (component.position) {
              mesh.position.set(
                component.position.x,
                component.position.y,
                component.position.z
              )
            }
            
            if (component.rotation) {
              mesh.rotation.set(
                THREE.MathUtils.degToRad(component.rotation.x),
                THREE.MathUtils.degToRad(component.rotation.y),
                THREE.MathUtils.degToRad(component.rotation.z)
              )
            }
            
            scene.add(mesh)
          } catch (error) {
            console.error('Failed to create component geometry:', error)
          }
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
      .replace(/xmlns="[^"]*"\s+xmlns="[^"]*"/, 'xmlns="http://www.w3.org/2000/svg"')

    return svgString
  } catch (error) {
    console.error('Failed to generate SVG:', error)
    throw error
  }
} 