import * as THREE from "three"
import {
  buildSectionCap,
  createSectionHatch,
  findSectionLoops,
  sectionPlane,
  type SectionSpec,
} from "./section-geometry"

/** Bake the visible half and caps into an export clone, preserving source geometry. */
export function createSectionExport(root: THREE.Object3D, spec: SectionSpec) {
  root.updateWorldMatrix(true, true)
  const output = root.clone(true)
  output.updateWorldMatrix(true, true)
  const plane = sectionPlane(spec)
  const hatch = createSectionHatch()
  const capMaterial = new THREE.MeshBasicMaterial({
    map: hatch,
    side: THREE.DoubleSide,
  })
  const ownedGeometries: THREE.BufferGeometry[] = []
  const ownedMaterials: THREE.Material[] = [capMaterial]
  output.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const indexed = Boolean(object.geometry.index)
    const source: THREE.BufferGeometry = object.geometry.index
      ? object.geometry.toNonIndexed()
      : object.geometry
    const p = source.getAttribute("position")
    if (!p) return
    const worldPositions = new Float32Array(p.count * 3)
    const world = new THREE.Vector3()
    for (let i = 0; i < p.count; i++)
      world
        .fromBufferAttribute(p, i)
        .applyMatrix4(object.matrixWorld)
        .toArray(worldPositions, i * 3)
    const attributes = Object.entries(source.attributes)
    const values = new Map(attributes.map(([name]) => [name, [] as number[]]))
    const geometry = new THREE.BufferGeometry()
    const point = (i: number) =>
      new THREE.Vector3().fromArray(worldPositions, i * 3)
    for (let i = 0; i < p.count; i += 3) {
      // Store vertices as barycentric weights so all vertex attributes interpolate.
      let polygon = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ]
      const distances = [0, 1, 2].map((j) =>
        plane.distanceToPoint(point(i + j)),
      )
      const next: number[][] = []
      for (let j = 0; j < 3; j++) {
        const a = polygon[j]!,
          b = polygon[(j + 1) % 3]!
        const da = distances[j]!,
          db = distances[(j + 1) % 3]!
        if (da >= 0) next.push(a)
        if (da >= 0 !== db >= 0) {
          const t = da / (da - db)
          next.push(a.map((v, k) => v + t * (b[k]! - v)))
        }
      }
      polygon = next
      const start = values.get("position")!.length / 3
      for (let j = 1; j + 1 < polygon.length; j++)
        for (const weights of [polygon[0]!, polygon[j]!, polygon[j + 1]!]) {
          for (const [name, attribute] of attributes)
            for (let c = 0; c < attribute.itemSize; c++) {
              values
                .get(name)!
                .push(
                  weights.reduce(
                    (sum, weight, k) =>
                      sum + weight * attribute.getComponent(i + k, c),
                    0,
                  ),
                )
            }
        }
      const count = values.get("position")!.length / 3 - start
      const group = source.groups.find(
        (g) => i >= g.start && i < g.start + g.count,
      )
      if (count) {
        const materialIndex = group?.materialIndex ?? 0
        const previous = geometry.groups.at(-1)
        if (
          previous &&
          previous.materialIndex === materialIndex &&
          previous.start + previous.count === start
        )
          previous.count += count
        else geometry.addGroup(start, count, materialIndex)
      }
    }
    for (const [name, attribute] of attributes)
      geometry.setAttribute(
        name,
        new THREE.Float32BufferAttribute(values.get(name)!, attribute.itemSize),
      )
    if (geometry.getAttribute("normal")) geometry.normalizeNormals()
    ownedGeometries.push(geometry)
    object.geometry = geometry
    const cloneMaterial = (material: THREE.Material) => {
      const clone = material.clone()
      clone.clippingPlanes = null
      ownedMaterials.push(clone)
      return clone
    }
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMaterial)
      : cloneMaterial(object.material)
    const { loops } = findSectionLoops({ positions: worldPositions, ...spec })
    const cap = buildSectionCap(loops, spec)
    cap.applyMatrix4(new THREE.Matrix4().copy(object.matrixWorld).invert())
    ownedGeometries.push(cap)
    // Attach after traversal so newly created caps are not sliced again.
    object.userData.sectionExportCap = cap
    if (indexed) source.dispose()
  })
  const pending: THREE.Mesh[] = []
  output.traverse((object) => {
    if (object instanceof THREE.Mesh && object.userData.sectionExportCap)
      pending.push(object)
  })
  for (const mesh of pending) {
    mesh.add(new THREE.Mesh(mesh.userData.sectionExportCap, capMaterial))
    delete mesh.userData.sectionExportCap
  }
  delete output.userData.sectionView
  return {
    root: output,
    dispose: () => {
      ownedGeometries.forEach((g) => g.dispose())
      ownedMaterials.forEach((m) => m.dispose())
      hatch.dispose()
    },
  }
}
