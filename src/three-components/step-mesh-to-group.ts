import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
} from "three"

export type OcctBrepFace = {
  first: number
  last: number
  color: [number, number, number] | null
}

export type OcctMesh = {
  name: string
  color?: [number, number, number]
  brep_faces?: OcctBrepFace[]
  attributes: {
    position: { array: number[] }
    normal?: { array: number[] }
  }
  index: { array: number[] }
}

const DEFAULT_COLOR = new Color(0.82, 0.82, 0.82)

const createMaterial = (color?: [number, number, number] | null) =>
  new MeshStandardMaterial({
    color: color ? new Color(color[0], color[1], color[2]) : DEFAULT_COLOR,
  })

function applyFaceColorGroups(
  geometry: BufferGeometry,
  mesh: OcctMesh,
): MeshStandardMaterial[] {
  const defaultMaterial = createMaterial(mesh.color)
  const brepFaces = mesh.brep_faces ?? []
  if (brepFaces.length === 0) {
    return [defaultMaterial]
  }

  const sortedBrepFaces =
    brepFaces.length > 1
      ? [...brepFaces].sort((a, b) => a.first - b.first)
      : brepFaces

  const materials = [defaultMaterial]
  const materialIndexByColor = new Map<string, number>()
  const triangleCount = mesh.index.array.length / 3

  let triangleIndex = 0
  let faceIndex = 0

  const getMaterialIndexForFace = (color: [number, number, number] | null) => {
    if (!color) return 0
    const key = color.join(",")
    const existingIndex = materialIndexByColor.get(key)
    if (existingIndex !== undefined) {
      return existingIndex
    }
    const nextIndex = materials.length
    materials.push(createMaterial(color))
    materialIndexByColor.set(key, nextIndex)
    return nextIndex
  }

  while (triangleIndex < triangleCount) {
    const currentFace = sortedBrepFaces[faceIndex]
    let lastTriangleExclusive = triangleCount
    let materialIndex = 0

    if (currentFace) {
      if (triangleIndex < currentFace.first) {
        lastTriangleExclusive = currentFace.first
      } else {
        lastTriangleExclusive = currentFace.last + 1
        materialIndex = getMaterialIndexForFace(currentFace.color)
        faceIndex += 1
      }
    }

    if (lastTriangleExclusive > triangleIndex) {
      geometry.addGroup(
        triangleIndex * 3,
        (lastTriangleExclusive - triangleIndex) * 3,
        materialIndex,
      )
    }

    triangleIndex = lastTriangleExclusive
  }

  return materials
}

export function occtMeshesToGroup(meshes: OcctMesh[]): Group {
  const group = new Group()
  for (const mesh of meshes) {
    const positions = mesh.attributes.position?.array ?? []
    const indices = mesh.index?.array ?? []
    if (!positions.length || !indices.length) {
      continue
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))

    const normals = mesh.attributes.normal?.array ?? []
    if (normals.length) {
      geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3))
    } else {
      geometry.computeVertexNormals()
    }

    geometry.setIndex(indices)
    geometry.clearGroups()

    const materials = applyFaceColorGroups(geometry, mesh)
    const threeMesh = new Mesh(
      geometry,
      materials.length > 1 ? materials : materials[0],
    )
    threeMesh.name = mesh.name
    group.add(threeMesh)
  }

  return group
}
