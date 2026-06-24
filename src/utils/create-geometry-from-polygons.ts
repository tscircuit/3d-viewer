import * as THREE from "three"
import { BufferGeometry, Float32BufferAttribute } from "three"

export function createGeometryFromPolygons(polygons: any[]) {
  const geometry = new BufferGeometry()
  const vertices: number[] = []
  const normals: number[] = []

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
}
