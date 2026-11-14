import * as THREE from "three"
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js"
import type { ReferenceObjectSpec } from "./reference-object"

export const addReferenceObjectLabel = (
  group: THREE.Group,
  surface: THREE.Mesh,
  spec: ReferenceObjectSpec,
  {
    center,
    size,
    color,
  }: {
    center: THREE.Vector3Tuple
    size: THREE.Vector3Tuple
    color: number
  },
) => {
  if (typeof document === "undefined") return

  const canvas = document.createElement("canvas")
  canvas.width = 1024
  canvas.height = Math.round((canvas.width * size[1]) / size[0])
  const context = canvas.getContext("2d")
  if (!context) return

  const fontSize = Math.round(canvas.height * 0.42)
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillStyle = "white"
  context.font = `600 ${fontSize}px sans-serif`
  context.fillText(spec.name, canvas.width / 2, canvas.height * 0.26)
  context.font = `500 ${fontSize}px sans-serif`
  context.globalAlpha = 0.88
  context.fillText(
    `${spec.width} × ${spec.height} mm`,
    canvas.width / 2,
    canvas.height * 0.74,
  )

  const texture = new THREE.CanvasTexture(canvas)
  // Project onto the mesh so the text follows the curvature of the banana.
  surface.updateWorldMatrix(true, false)
  const geometry = new DecalGeometry(
    surface,
    new THREE.Vector3(...center),
    new THREE.Euler(),
    new THREE.Vector3(...size),
  )
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    toneMapped: false,
  })
  const label = new THREE.Mesh(geometry, material)
  label.name = "reference-object-label"
  group.add(label)
}
