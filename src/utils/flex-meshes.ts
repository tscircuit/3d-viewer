import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import {
  boundsOfTriangles,
  createPcbFold,
  createStiffenerMesh,
  foldSurfaceMesh,
  type SurfaceMesh,
  type Triangle,
} from "@tscircuit/flex-utils"
import * as THREE from "three"
import { configureObjectShadows } from "./configure-object-shadows"

/** Native Three geometry -> board-local Circuit JSON (+Z up, mm). Mesh matrices
 * are applied once; PCB coordinates and flat texture UVs are never changed. */
export function meshToSurface(
  mesh: THREE.Mesh,
  center: { x: number; y: number },
): SurfaceMesh {
  mesh.updateMatrix()
  const geometry = mesh.geometry.index
    ? mesh.geometry.toNonIndexed()
    : mesh.geometry
  const position = geometry.getAttribute("position"),
    uv = geometry.getAttribute("uv")
  const triangles: Triangle[] = []
  for (let i = 0; i < position.count; i += 3) {
    const vertices = [0, 1, 2].map((j) => {
      const v = new THREE.Vector3()
        .fromBufferAttribute(position, i + j)
        .applyMatrix4(mesh.matrix)
      return { x: v.x - center.x, y: v.y - center.y, z: v.z }
    }) as Triangle["vertices"]
    const [a, b, c] = vertices
    const n = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z)
      .cross(new THREE.Vector3(c.x - a.x, c.y - a.y, c.z - a.z))
      .normalize()
    triangles.push({
      vertices,
      normal: { x: n.x, y: n.y, z: n.z },
      ...(uv
        ? {
            uvs: [0, 1, 2].map((j) => ({
              u: uv.getX(i + j),
              v: uv.getY(i + j),
            })) as Triangle["uvs"],
          }
        : {}),
    })
  }
  if (geometry !== mesh.geometry) geometry.dispose()
  return { triangles, boundingBox: boundsOfTriangles(triangles) }
}
export function surfaceToGeometry(
  surface: SurfaceMesh,
  center: { x: number; y: number },
) {
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = []
  for (const triangle of surface.triangles)
    triangle.vertices.forEach((p, i) => {
      positions.push(p.x + center.x, p.y + center.y, p.z)
      normals.push(triangle.normal.x, triangle.normal.y, triangle.normal.z)
      uvs.push(triangle.uvs?.[i]?.u ?? 0, triangle.uvs?.[i]?.v ?? 0)
    })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
function replaceGeometry(
  mesh: THREE.Mesh,
  surface: SurfaceMesh,
  board: PcbBoard,
) {
  const output = mesh.clone()
  output.geometry = surfaceToGeometry(surface, board.center)
  output.position.set(0, 0, 0)
  output.rotation.set(0, 0, 0)
  output.scale.set(1, 1, 1)
  output.updateMatrix()
  return output
}

/** Bend native board/copper meshes and clipped texture surfaces, retaining the
 * viewer's materials and model loaders. No GLTF conversion takes place. */
export function createFlexMeshes(
  geometryMeshes: THREE.Mesh[],
  textureMeshes: THREE.Mesh[],
  json: AnyCircuitElement[],
  foldPcbs: boolean,
) {
  const boards = json.filter((e): e is PcbBoard => e.type === "pcb_board")
  const bends = json.filter((e) => e.type === "pcb_bend"),
    stiffeners = json.filter((e) => e.type === "pcb_stiffener")
  if (!bends.length && !stiffeners.length)
    return { geometryMeshes, textureMeshes }
  const board = boards[0]
  if (
    !board ||
    boards.length !== 1 ||
    json.some((e) => e.type === "pcb_panel") ||
    [...bends, ...stiffeners].some((e) => e.pcb_board_id !== board.pcb_board_id)
  )
    throw new Error(
      "Flex rendering requires one board, matching board references, and no panel",
    )
  const fold = foldPcbs
    ? createPcbFold(bends, board.thickness ?? 1.6)
    : undefined
  const body = geometryMeshes.find((m) => m.name === "board-geom")
  const flatBody = body ? meshToSurface(body, board.center) : undefined
  const geometry = fold
    ? geometryMeshes.map((mesh) =>
        replaceGeometry(
          mesh,
          foldSurfaceMesh(meshToSurface(mesh, board.center), fold),
          board,
        ),
      )
    : [...geometryMeshes]
  const textures =
    fold && flatBody
      ? textureMeshes.map((mesh) => {
          // A rectangular texture plane contains transparent area outside the outline.
          // Clip it to the native board's actual faces (including holes) before folding.
          mesh.updateMatrix()
          const inverse = mesh.matrix.clone().invert()
          const bottom = mesh.name.startsWith("bottom")
          const dimensions = (mesh.geometry as THREE.PlaneGeometry).parameters
          const triangles = flatBody.triangles
            .filter((t) => (bottom ? t.normal.z < -0.9 : t.normal.z > 0.9))
            .map((t) => {
              const vertices = t.vertices.map((p) => ({
                ...p,
                z: mesh.position.z,
              })) as Triangle["vertices"]
              const uvs = vertices.map((p) => {
                const local = new THREE.Vector3(
                  p.x + board.center.x,
                  p.y + board.center.y,
                  p.z,
                ).applyMatrix4(inverse)
                return {
                  u: local.x / dimensions.width + 0.5,
                  v: local.y / dimensions.height + 0.5,
                }
              }) as Triangle["uvs"]
              return { ...t, vertices, uvs }
            })
          const result = replaceGeometry(
            mesh,
            foldSurfaceMesh(
              { triangles, boundingBox: boundsOfTriangles(triangles) },
              fold,
            ),
            board,
          )
          mesh.geometry.dispose()
          return result
        })
      : textureMeshes
  for (const stiffener of stiffeners) {
    const mesh = new THREE.Mesh(
      surfaceToGeometry(
        createStiffenerMesh({
          stiffener: stiffener,
          boardThickness: board.thickness ?? 1.6,
          fold: fold,
        }),
        board.center,
      ),
      new THREE.MeshStandardMaterial({
        color:
          stiffener.material === "fr4"
            ? "#879568"
            : stiffener.material === "polyimide"
              ? "#bd7f27"
              : "#b8bdc4",
        side: THREE.DoubleSide,
      }),
    )
    mesh.name = "board-stiffener"
    configureObjectShadows(mesh)
    geometry.push(mesh)
  }
  const bounds = new THREE.Box3()
  for (const mesh of [...geometry, ...textures]) bounds.expandByObject(mesh)
  return {
    geometryMeshes: geometry,
    textureMeshes: textures,
    bounds: {
      minX: bounds.min.x,
      maxX: bounds.max.x,
      minY: bounds.min.y,
      maxY: bounds.max.y,
      minZ: bounds.min.z,
      maxZ: bounds.max.z,
    },
  }
}
