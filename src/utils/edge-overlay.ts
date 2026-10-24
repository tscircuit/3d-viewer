import * as THREE from "three"
import { LineMaterial, LineSegments2, LineSegmentsGeometry } from "three-stdlib"
import { extractModelEdges } from "./extract-model-edges"

export type EdgeOverlayMode = "off" | "visible" | "hidden"

interface MeshEdges {
  geometry: THREE.BufferGeometry
  positionAttribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute
  indexAttribute: THREE.BufferAttribute | null
  positionVersion: number
  indexVersion: number
  rangeStart: number
  rangeCount: number
  group: THREE.Group
  linesGeometry: LineSegmentsGeometry
  visible: LineSegments2
  hidden: LineSegments2
}

const isSurfaceTexture = (mesh: THREE.Mesh) =>
  mesh.name === "top-board-texture-plane" ||
  mesh.name === "bottom-board-texture-plane" ||
  mesh.name === "jscad-top-board-texture" ||
  mesh.name === "jscad-bottom-board-texture"

const canOutline = (mesh: THREE.Mesh) => {
  const position = mesh.geometry.getAttribute("position")
  if (
    (mesh as THREE.Mesh & { isLineSegments2?: boolean }).isLineSegments2 ||
    mesh instanceof THREE.SkinnedMesh ||
    mesh instanceof THREE.InstancedMesh ||
    isSurfaceTexture(mesh) ||
    !position ||
    position.itemSize < 3 ||
    Math.min(
      mesh.geometry.drawRange.count,
      (mesh.geometry.index?.count ?? position.count) -
        mesh.geometry.drawRange.start,
    ) < 3
  ) {
    return false
  }
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material]
  return materials.some(
    (material) =>
      material.visible &&
      material.opacity > 0 &&
      !(material instanceof THREE.ShadowMaterial),
  )
}

const isVisible = (mesh: THREE.Mesh) => {
  let object: THREE.Object3D | null = mesh
  while (object) {
    if (!object.visible) return false
    object = object.parent
  }
  return true
}

const attributeVersion = (attribute: THREE.BufferAttribute | undefined) =>
  attribute?.version ?? 0

const positionVersion = (geometry: THREE.BufferGeometry) => {
  const position = geometry.getAttribute("position")
  return position instanceof THREE.InterleavedBufferAttribute
    ? position.data.version
    : position.version
}

const createLinesGeometry = (geometry: THREE.BufferGeometry) => {
  const lines = new LineSegmentsGeometry()
  lines.setPositions(extractModelEdges(geometry))
  return lines
}

/** Display-only lines live outside the exportable and pickable model root. */
export const createEdgeOverlay = (
  rootObject: THREE.Object3D,
  scene: THREE.Scene,
) => {
  const group = new THREE.Group()
  group.name = "cad-edge-overlay"
  scene.add(group)

  const meshes = new Map<THREE.Mesh, MeshEdges>()
  let visibleMaterial: LineMaterial | undefined
  let hiddenMaterial: LineMaterial | undefined

  const removeMesh = (mesh: THREE.Mesh, edges: MeshEdges) => {
    group.remove(edges.group)
    edges.linesGeometry.dispose()
    meshes.delete(mesh)
  }

  const clear = () => {
    for (const [mesh, edges] of meshes) removeMesh(mesh, edges)
    visibleMaterial?.dispose()
    hiddenMaterial?.dispose()
    visibleMaterial = undefined
    hiddenMaterial = undefined
  }

  return {
    group,
    update(
      mode: EdgeOverlayMode,
      width: number,
      darkBackgroundEnabled = false,
    ) {
      if (mode === "off") {
        clear()
        return
      }

      visibleMaterial ??= new LineMaterial({
        transparent: true,
        depthTest: true,
        depthWrite: false,
        depthFunc: THREE.LessEqualDepth,
        toneMapped: false,
      })
      hiddenMaterial ??= new LineMaterial({
        transparent: true,
        opacity: 0.35,
        depthTest: true,
        depthWrite: false,
        depthFunc: THREE.GreaterDepth,
        toneMapped: false,
        dashed: true,
        dashSize: 0.8,
        gapSize: 0.5,
      })
      const lineWidth = Number.isFinite(width) ? Math.max(0.5, width) : 2
      visibleMaterial.linewidth = lineWidth
      hiddenMaterial.linewidth = lineWidth
      visibleMaterial.color.set(darkBackgroundEnabled ? "#edf2f7" : "#182430")
      hiddenMaterial.color.set(darkBackgroundEnabled ? "#b8c7d9" : "#52677e")

      // Asynchronous model loads and layer switches add/remove meshes without
      // replacing rootObject. Only discovery runs per frame; extraction is cached.
      rootObject.updateWorldMatrix(true, true)
      const found = new Set<THREE.Mesh>()
      rootObject.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !canOutline(object)) return
        found.add(object)
        const geometry = object.geometry
        let edges = meshes.get(object)
        const currentPositionVersion = positionVersion(geometry)
        const currentIndexVersion = attributeVersion(
          geometry.index ?? undefined,
        )
        if (
          edges &&
          (edges.geometry !== geometry ||
            edges.positionAttribute !== geometry.getAttribute("position") ||
            edges.indexAttribute !== geometry.index ||
            edges.positionVersion !== currentPositionVersion ||
            edges.indexVersion !== currentIndexVersion ||
            edges.rangeStart !== geometry.drawRange.start ||
            edges.rangeCount !== geometry.drawRange.count)
        ) {
          removeMesh(object, edges)
          edges = undefined
        }
        if (!edges) {
          const linesGeometry = createLinesGeometry(geometry)
          const visible = new LineSegments2(linesGeometry, visibleMaterial)
          const hidden = new LineSegments2(linesGeometry, hiddenMaterial)
          visible.computeLineDistances()
          for (const [line, edgeType] of [
            [visible, "visible"],
            [hidden, "hidden"],
          ] as const) {
            line.userData.sourceMeshUuid = object.uuid
            line.userData.edgeType = edgeType
            // LineSegments2 is a Mesh. Explicitly keep it out of raycasting too.
            line.raycast = () => {}
            line.frustumCulled = false
            line.renderOrder = edgeType === "visible" ? 10001 : 10000
          }
          const meshGroup = new THREE.Group()
          meshGroup.userData.sourceMeshUuid = object.uuid
          meshGroup.matrixAutoUpdate = false
          meshGroup.add(hidden, visible)
          group.add(meshGroup)
          edges = {
            geometry,
            positionAttribute: geometry.getAttribute("position"),
            indexAttribute: geometry.index,
            positionVersion: currentPositionVersion,
            indexVersion: currentIndexVersion,
            rangeStart: geometry.drawRange.start,
            rangeCount: geometry.drawRange.count,
            group: meshGroup,
            linesGeometry,
            visible,
            hidden,
          }
          meshes.set(object, edges)
        }
        edges.group.visible = isVisible(object)
        edges.group.matrix.copy(object.matrixWorld)
        edges.visible.layers.mask = object.layers.mask
        edges.hidden.layers.mask = object.layers.mask
        edges.hidden.visible = mode === "hidden"
      })
      for (const [mesh, edges] of meshes) {
        if (!found.has(mesh)) removeMesh(mesh, edges)
      }
    },
    dispose() {
      clear()
      scene.remove(group)
    },
  }
}
