import * as THREE from "three"
import { GLTFLoader } from "three-stdlib"
import { configureObjectShadows } from "./configure-object-shadows"

/** Identity stored in glTF node extras.tscircuit, never full Circuit JSON. */
export interface GlbComponentMetadata {
  cad_component_id?: string
  source_component_id?: string
  pcb_component_id?: string
  componentName?: string
}

export function getGlbComponentMetadata(
  object: THREE.Object3D,
): GlbComponentMetadata | undefined {
  const metadata = object.userData.tscircuit
  if (!metadata || typeof metadata !== "object") return
  const result: GlbComponentMetadata = {}
  for (const key of [
    "cad_component_id",
    "source_component_id",
    "pcb_component_id",
    "componentName",
  ] as const) {
    if (typeof metadata[key] === "string") result[key] = metadata[key]
  }
  return result
}

/** Convert the exporter's +Y-up mm scene to the viewer's +Z-up mm scene.
 * Inverts circuit-json-to-gltf GLTFBuilder.toGltfTranslation and the
 * circuit-to-3d CAD center mapping: glTF (-x, z, y) -> circuit (x, y, z).
 * This is a proper rotation (determinant +1), applied to points/directions
 * alike with no translation or scale change. */
export function prepareGlbScene(scene: THREE.Group): THREE.Group {
  const root = new THREE.Group()
  root.name = "prerendered-glb"
  root.applyMatrix4(
    new THREE.Matrix4().set(-1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1),
  )
  root.add(scene)
  scene.traverse((object) => {
    const metadata = getGlbComponentMetadata(object)
    if (metadata) Object.assign(object.userData, metadata)
  })
  configureObjectShadows(root)
  return root
}

/** Dispose only resources owned by this load, including shared textures once. */
export function disposeGlbScene(scene: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    geometries.add(object.geometry)
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      materials.add(material)
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value)
      }
    }
  })
  for (const texture of textures) {
    texture.dispose()
    if (
      typeof ImageBitmap !== "undefined" &&
      texture.image instanceof ImageBitmap
    )
      texture.image.close()
  }
  for (const material of materials) material.dispose()
  for (const geometry of geometries) geometry.dispose()
}

export async function loadGlbScene(
  source: string | ArrayBuffer,
  signal: AbortSignal,
): Promise<THREE.Group> {
  const loadSignal = AbortSignal.any([signal, AbortSignal.timeout(30_000)])
  let bytes: ArrayBuffer
  if (typeof source === "string") {
    const response = await fetch(source, { signal: loadSignal })
    if (!response.ok) throw new Error(`Unable to load GLB (${response.status})`)
    bytes = await response.arrayBuffer()
  } else bytes = source
  loadSignal.throwIfAborted()
  const gltf = await new GLTFLoader().parseAsync(bytes, "")
  // Parsing (including texture decoding) can finish after an aborted fetch.
  if (loadSignal.aborted) {
    disposeGlbScene(gltf.scene)
    loadSignal.throwIfAborted()
  }
  return prepareGlbScene(gltf.scene)
}
