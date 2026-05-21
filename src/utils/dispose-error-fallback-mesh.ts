import type { Material, Mesh } from "three"

export function disposeErrorFallbackMesh(mesh: Mesh): void {
  mesh.geometry.dispose()

  const materials: Material[] = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material]

  for (const material of materials) {
    material.dispose()
  }
}
