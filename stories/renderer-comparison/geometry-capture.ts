import * as THREE from "three"
import type {
  CalibrationMutation,
  ComparisonView,
  GeometryCapture,
  PreparedComparison,
} from "../../tests/fixtures/renderer-parity/types"

export const CAPTURE_SIZE = 640
export const CREASE_THRESHOLD_DEGREES = 30

export function comparisonCamera(
  fixture: PreparedComparison,
  view: ComparisonView,
) {
  const { span, target } = fixture.camera
  if (!Number.isFinite(span) || span <= 0 || !target.every(Number.isFinite)) {
    throw new Error(
      "Comparison camera must have a finite target and positive span",
    )
  }
  const camera = new THREE.OrthographicCamera(
    -span / 2,
    span / 2,
    span / 2,
    -span / 2,
    0.01,
    Math.max(1000, span * 20),
  )
  const direction =
    view === "oblique"
      ? new THREE.Vector3(1, -1.4, 1.05)
      : new THREE.Vector3(1, -0.08, 0.16)
  if (fixture.camera.fromBelow) direction.z = -direction.z
  camera.position
    .fromArray(target)
    .add(direction.normalize().multiplyScalar(span * 3))
  camera.up.set(0, 0, 1)
  camera.lookAt(new THREE.Vector3(...target))
  camera.updateMatrixWorld(true)
  return camera
}

export function vertexCount(object: THREE.Object3D) {
  let count = 0
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      count += child.geometry.getAttribute("position")?.count ?? 0
    }
  })
  return count
}

function geometryClone(source: THREE.Object3D, mutation?: CalibrationMutation) {
  source.updateWorldMatrix(true, true)
  const clone = source.clone(true)
  clone.matrixAutoUpdate = false
  clone.matrix.copy(source.matrixWorld)

  // Test-only mutations affect this detached copy, never the loaded renderer.
  if (mutation === "origin-shift") {
    clone.matrix.premultiply(
      new THREE.Matrix4().makeTranslation(0, 0.2248885, 0),
    )
  } else if (mutation === "reverse-x" || mutation === "wrong-order") {
    const rotation = source.rotation.clone()
    if (mutation === "reverse-x") rotation.x = -rotation.x
    else rotation.set(rotation.x, rotation.y, rotation.z, "ZYX")
    const local = new THREE.Matrix4().compose(
      source.position,
      new THREE.Quaternion().setFromEuler(rotation),
      source.scale,
    )
    clone.matrix.copy(local)
    if (source.parent) clone.matrix.premultiply(source.parent.matrixWorld)
  }
  clone.matrixWorldNeedsUpdate = true
  return clone
}

function renderGeometry(
  renderer: THREE.WebGLRenderer,
  camera: THREE.OrthographicCamera,
  source: THREE.Object3D,
  mutation?: CalibrationMutation,
) {
  const clone = geometryClone(source, mutation)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0)
  const surface = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    toneMapped: false,
  })
  const crease = new THREE.LineBasicMaterial({
    color: 0,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  })
  const edgeGeometries: THREE.EdgesGeometry[] = []
  try {
    const meshes: THREE.Mesh[] = []
    const nonSurfaces: THREE.Object3D[] = []
    clone.traverse((child) => {
      if (
        child instanceof THREE.SkinnedMesh ||
        child instanceof THREE.InstancedMesh
      ) {
        throw new Error("Geometry capture requires ordinary loaded CAD meshes")
      }
      if (child instanceof THREE.Mesh) meshes.push(child)
      else if (
        child instanceof THREE.Line ||
        child instanceof THREE.Points ||
        child instanceof THREE.Sprite
      ) {
        nonSurfaces.push(child)
      }
    })
    for (const child of nonSurfaces) child.removeFromParent()
    for (const mesh of meshes) {
      // Mesh geometries remain shared and read-only; only temporary edges are disposed.
      mesh.material = surface
      mesh.castShadow = false
      mesh.receiveShadow = false
      mesh.renderOrder = 0
      const edges = new THREE.EdgesGeometry(
        mesh.geometry,
        CREASE_THRESHOLD_DEGREES,
      )
      edgeGeometries.push(edges)
      const lines = new THREE.LineSegments(edges, crease)
      lines.renderOrder = 1
      mesh.add(lines)
    }
    scene.add(clone)
    renderer.render(scene, camera)
    return renderer.domElement.toDataURL("image/png")
  } finally {
    for (const geometry of edgeGeometries) geometry.dispose()
    surface.dispose()
    crease.dispose()
    scene.clear()
  }
}

export function captureGeometry(
  fixture: PreparedComparison,
  viewer: THREE.Object3D,
  exporter: THREE.Object3D | null,
  view: ComparisonView,
  mutation?: CalibrationMutation,
): GeometryCapture {
  if (view !== "oblique" && view !== "side") {
    throw new Error(`Unknown comparison view: ${view}`)
  }
  if (mutation !== undefined && fixture.id !== "calibration") {
    throw new Error("Test-only mutations require the calibration fixture")
  }
  if (fixture.id === "calibration" && mutation === undefined) {
    throw new Error(
      "Calibration requires a mutation selection, including 'none'",
    )
  }
  if (
    mutation !== undefined &&
    !["none", "origin-shift", "reverse-x", "wrong-order"].includes(mutation)
  ) {
    throw new Error(`Unknown calibration mutation: ${mutation}`)
  }
  const right = mutation === undefined ? exporter : viewer
  const camera = comparisonCamera(fixture, view)
  const viewerVertexCount = vertexCount(viewer)
  const exporterVertexCount = right ? vertexCount(right) : undefined
  if (!viewerVertexCount || (right && !exporterVertexCount)) {
    throw new Error("Cannot capture empty CAD geometry")
  }
  // One short-lived context renders both sides sequentially, with no MSAA or DPR variation.
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "low-power",
  })
  try {
    renderer.setPixelRatio(1)
    renderer.setSize(CAPTURE_SIZE, CAPTURE_SIZE, false)
    renderer.toneMapping = THREE.NoToneMapping
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = false
    return {
      width: CAPTURE_SIZE,
      height: CAPTURE_SIZE,
      leftPng: renderGeometry(renderer, camera, viewer),
      rightPng: right
        ? renderGeometry(renderer, camera, right, mutation)
        : undefined,
      exportError: mutation === undefined ? fixture.exportError : undefined,
      exportMessages: mutation === undefined ? fixture.exportMessages : [],
      metadata: {
        caseId: fixture.id,
        view,
        mutation,
        cameraPosition: camera.position.toArray(),
        cameraTarget: [...fixture.camera.target],
        cameraSpan: fixture.camera.span,
        cameraFromBelow: Boolean(fixture.camera.fromBelow),
        viewerVertexCount,
        exporterVertexCount,
        viewerRotation: [
          viewer.rotation.x,
          viewer.rotation.y,
          viewer.rotation.z,
        ],
      },
    }
  } finally {
    renderer.dispose()
    renderer.forceContextLoss()
  }
}
