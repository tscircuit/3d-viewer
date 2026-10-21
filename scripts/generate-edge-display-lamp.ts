import jscad from "@jscad/modeling"
import type { generalize as generalizeGeometry } from "@jscad/modeling/src/operations/modifiers/generalize"
import { executeJscadOperations } from "jscad-planner"
import * as THREE from "three"
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js"
import { lampParts } from "../stories/edge-display/lamp"

// GLTFExporter reads its binary buffers through the browser FileReader API.
class BinaryFileReader {
  result: ArrayBuffer | null = null
  onloadend?: () => void
  readAsArrayBuffer(blob: Blob) {
    blob.arrayBuffer().then((bytes) => {
      this.result = bytes
      this.onloadend?.()
    })
  }
}
if (typeof FileReader === "undefined")
  Object.assign(globalThis, { FileReader: BinaryFileReader })

// The pinned JSCAD type barrel omits the function default export.
const generalize = jscad.modifiers
  .generalize as unknown as typeof generalizeGeometry

const scene = new THREE.Scene()
const root = new THREE.Group()
// Inverse of prepareGlbScene: circuit (x, y, z) -> glTF (-x, z, y).
root.applyMatrix4(
  new THREE.Matrix4().set(-1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1),
)
scene.add(root)
for (const part of lampParts) {
  const solid = executeJscadOperations(jscad as any, part.plan)
  const triangles = generalize({ snap: true, triangulate: true }, solid)
  const positions = jscad.geometries.geom3
    .toPolygons(triangles)
    .flatMap((polygon) => polygon.vertices.flat())
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(...part.color),
      side: THREE.DoubleSide,
      roughness: 1,
    }),
  )
  mesh.name = part.name
  mesh.position.fromArray(part.position)
  mesh.userData.tscircuit = {
    cad_component_id: `cad_${part.name}`,
    source_component_id: `source_${part.name}`,
    componentName: part.name,
  }
  root.add(mesh)
}
const glb = await new GLTFExporter().parseAsync(scene, { binary: true })
if (!(glb instanceof ArrayBuffer)) throw new Error("Expected binary GLB")
const path = new URL(
  "../stories/assets/prerendered-glb/edge-display-lamp.glb",
  import.meta.url,
)
await Bun.write(path, glb)
console.log(`Generated ${path.pathname} (${glb.byteLength} bytes)`)
