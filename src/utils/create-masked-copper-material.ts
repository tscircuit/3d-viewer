import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import * as THREE from "three"
import type { LayerVisibilityState } from "../contexts/LayerVisibilityContext"
import { colors, TRACE_TEXTURE_RESOLUTION } from "../geoms/constants"
import { createSoldermaskTextureForLayer } from "../textures/create-soldermask-texture-for-layer"
import { getSoldermaskRenderBounds } from "../textures/soldermask/soldermask-bounds"
import { getLayerTextureResolution } from "./layer-texture-resolution"

export function createMaskedCopperMaterial({
  circuitJson,
  boardData,
  visibility,
}: {
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  visibility: Pick<LayerVisibilityState, "topMask" | "bottomMask">
}) {
  const bounds = getSoldermaskRenderBounds(circuitJson, boardData)
  const traceTextureResolution = getLayerTextureResolution(
    {
      ...boardData,
      width: bounds.width,
      height: bounds.height,
      outline: undefined,
    },
    TRACE_TEXTURE_RESOLUTION,
    { maxTexturePixels: 2_000_000, maxTextureDimension: 2048 },
  )
  const masks = (["top", "bottom"] as const).map((layer) =>
    createSoldermaskTextureForLayer({
      layer,
      circuitJson,
      boardData,
      traceTextureResolution,
    }),
  )
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(...colors.copper),
    side: THREE.DoubleSide,
    flatShading: true,
  })
  const canvas = document.createElement("canvas")
  canvas.width = masks[0]?.image.width ?? 1
  canvas.height = 2 * (masks[0]?.image.height ?? 1)
  const ctx = canvas.getContext("2d")
  if (ctx) {
    // Top occupies the upper atlas half. The bottom source canvas is flipped
    // already; unflip it so both halves use board-space XY texture coordinates.
    if (visibility.topMask && masks[0]) ctx.drawImage(masks[0].image, 0, 0)
    if (visibility.bottomMask && masks[1]) {
      ctx.save()
      ctx.translate(0, canvas.height)
      ctx.scale(1, -1)
      ctx.drawImage(masks[1].image, 0, 0)
      ctx.restore()
    }
  }
  const mask = new THREE.CanvasTexture(canvas)
  mask.colorSpace = THREE.SRGBColorSpace
  mask.generateMipmaps = false
  mask.minFilter = THREE.LinearFilter
  mask.magFilter = THREE.LinearFilter
  material.userData.copperMaskBounds = [
    bounds.minX,
    bounds.minY,
    bounds.width,
    bounds.height,
  ]
  material.onBeforeCompile = (shader) => {
    shader.uniforms.copperMaskAtlas = { value: mask }
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 vCopperMaskUv;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvCopperMaskUv = uv;",
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform sampler2D copperMaskAtlas;\nvarying vec2 vCopperMaskUv;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec4 copperMask = texture2D(copperMaskAtlas, vCopperMaskUv);
        float copperMaskCoverage = copperMask.a;
        diffuseColor.rgb = mix(diffuseColor.rgb, copperMask.rgb, copperMaskCoverage);
      `,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.54, copperMaskCoverage);",
      )
      .replace(
        "#include <metalnessmap_fragment>",
        "#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.025, copperMaskCoverage);",
      )
  }
  material.customProgramCacheKey = () => "masked-hole-copper-v1"
  for (const source of masks) source?.dispose()
  return {
    material,
    dispose: () => {
      material.dispose()
      mask.dispose()
    },
  }
}

// Three's Material.clone() does not copy shader callbacks.
export function cloneMaskedCopperMaterial(
  material: THREE.MeshStandardMaterial,
) {
  const clone = material.clone()
  clone.onBeforeCompile = material.onBeforeCompile
  clone.customProgramCacheKey = material.customProgramCacheKey
  return clone
}

/** Project board-space points (mm, +Z up) into the mask atlas before folding.
 * Split triangles at the board midplane so UVs never interpolate between layers.
 * Flex folding preserves these UVs while moving the geometry. */
export function applyCopperMaskUvs(
  geometry: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial,
) {
  const [minX, minY, width, height] = material.userData
    .copperMaskBounds as number[]
  const source = geometry.index ? geometry.toNonIndexed() : geometry
  const attribute = source.getAttribute("position")
  const positions: number[] = [],
    uvs: number[] = []
  const emit = (polygon: THREE.Vector3[], top: boolean) => {
    for (let i = 1; i < polygon.length - 1; i++) {
      const triangle = [polygon[0]!, polygon[i]!, polygon[i + 1]!]
      if (
        new THREE.Vector3()
          .subVectors(triangle[1]!, triangle[0]!)
          .cross(new THREE.Vector3().subVectors(triangle[2]!, triangle[0]!))
          .lengthSq() < 1e-20
      )
        continue
      for (const point of triangle) {
        positions.push(point.x, point.y, point.z)
        uvs.push(
          (point.x - minX!) / width!,
          ((point.y - minY!) / height! + Number(top)) / 2,
        )
      }
    }
  }
  const clip = (triangle: THREE.Vector3[], top: boolean) => {
    const polygon: THREE.Vector3[] = []
    for (let i = 0; i < triangle.length; i++) {
      const a = triangle[i]!,
        b = triangle[(i + 1) % triangle.length]!
      const insideA = top ? a.z >= 0 : a.z <= 0
      const insideB = top ? b.z >= 0 : b.z <= 0
      if (insideA) polygon.push(a)
      if (insideA !== insideB)
        polygon.push(a.clone().lerp(b, -a.z / (b.z - a.z)))
    }
    return polygon
  }
  for (let i = 0; i < attribute.count; i += 3) {
    const triangle = [0, 1, 2].map((j) =>
      new THREE.Vector3().fromBufferAttribute(attribute, i + j),
    )
    if (triangle.every((p) => p.z >= 0)) emit(triangle, true)
    else if (triangle.every((p) => p.z <= 0)) emit(triangle, false)
    else {
      emit(clip(triangle, true), true)
      emit(clip(triangle, false), false)
    }
  }
  if (source !== geometry) source.dispose()
  geometry.setIndex(null)
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  geometry.deleteAttribute("normal")
  geometry.clearGroups()
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
}
