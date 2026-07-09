import * as THREE from "three"
import type { RenderingMode } from "../contexts/RenderingModeContext"

type ComponentMaterialKind = "plastic" | "metal" | "pin"

type ComponentMaterialTextureProfile = {
  id: "Plastic013A" | "Metal055A" | "Metal050A"
  label: string
  sourceUrl: string
  metalness: number
  roughness: number
  roughnessVariance: number
  detailStrength: number
  bumpScale: number
  repeat: number
}

export type ComponentMaterialProfileSnapshot = {
  material: THREE.MeshStandardMaterial
  envMap: THREE.Texture | null
  envMapIntensity: number
  metalness: number
  roughness: number
  roughnessMap: THREE.Texture | null
  bumpMap: THREE.Texture | null
  bumpScale: number
}

type ComponentTextureMaps = {
  bumpMap: THREE.CanvasTexture
  roughnessMap: THREE.CanvasTexture
}

const TEXTURE_SIZE = 128
const componentTextureCache = new Map<string, ComponentTextureMaps>()

const COMPONENT_MATERIAL_TEXTURE_PROFILES: Record<
  ComponentMaterialKind,
  ComponentMaterialTextureProfile
> = {
  plastic: {
    id: "Plastic013A",
    label: "Plastic 013 A",
    sourceUrl: "https://ambientcg.com/view?id=Plastic013A",
    metalness: 0.02,
    roughness: 0.64,
    roughnessVariance: 0.1,
    detailStrength: 0.04,
    bumpScale: 0.014,
    repeat: 5,
  },
  metal: {
    id: "Metal055A",
    label: "Metal 055 A",
    sourceUrl: "https://ambientcg.com/view?id=Metal055A",
    metalness: 0.86,
    roughness: 0.42,
    roughnessVariance: 0.14,
    detailStrength: 0.052,
    bumpScale: 0.01,
    repeat: 4,
  },
  pin: {
    id: "Metal050A",
    label: "Metal 050 A",
    sourceUrl: "https://ambientcg.com/view?id=Metal050A",
    metalness: 0.92,
    roughness: 0.24,
    roughnessVariance: 0.06,
    detailStrength: 0.022,
    bumpScale: 0.004,
    repeat: 3,
  },
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const hashNoise = (x: number, y: number, salt: number) => {
  let hash = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ salt
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295
}

const smoothstep = (value: number) => value * value * (3 - 2 * value)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const valueNoise = (x: number, y: number, scale: number, salt: number) => {
  const sx = x / scale
  const sy = y / scale
  const x0 = Math.floor(sx)
  const y0 = Math.floor(sy)
  const tx = smoothstep(sx - x0)
  const ty = smoothstep(sy - y0)

  const top = lerp(hashNoise(x0, y0, salt), hashNoise(x0 + 1, y0, salt), tx)
  const bottom = lerp(
    hashNoise(x0, y0 + 1, salt),
    hashNoise(x0 + 1, y0 + 1, salt),
    tx,
  )

  return lerp(top, bottom, ty)
}

const createMapTexture = (
  kind: ComponentMaterialKind,
  channel: "bump" | "roughness",
) => {
  const profile = COMPONENT_MATERIAL_TEXTURE_PROFILES[kind]
  const canvas = document.createElement("canvas")
  canvas.width = TEXTURE_SIZE
  canvas.height = TEXTURE_SIZE
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const imageData = ctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE)
  const data = imageData.data

  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const i = (y * TEXTURE_SIZE + x) * 4
      const cloudy =
        (valueNoise(x, y, 18, kind === "plastic" ? 101 : 211) - 0.5) * 0.55 +
        (valueNoise(x, y, 48, kind === "pin" ? 307 : 131) - 0.5) * 0.35
      const fine =
        (hashNoise(x, y, kind === "plastic" ? 151 : 251) - 0.5) * 0.28
      const brushed =
        Math.sin(x * 0.2 + y * 0.035 + valueNoise(x, y, 42, 281) * 4.6) * 0.2
      const fineBrush =
        Math.sin(x * 0.42 + valueNoise(x, y, 72, 317) * 2.8) * 0.1
      const ironGrain =
        (hashNoise(x, y, 347) - 0.5) * 0.74 +
        (valueNoise(x, y, 7, 349) - 0.5) * 0.62
      const plasticPebble =
        Math.sin(x * 0.62 + valueNoise(x, y, 14, 173) * 3.2) * 0.22 +
        Math.sin(y * 0.58 + valueNoise(x, y, 16, 179) * 3.4) * 0.2
      const plasticStipple =
        Math.sin(x * 0.32 + y * 0.05 + valueNoise(x, y, 34, 191) * 4.4) * 0.12

      const detail =
        kind === "pin"
          ? fineBrush + brushed * 0.42 + cloudy * 0.16 + fine * 0.06
          : kind === "metal"
            ? ironGrain * 0.42 + brushed * 0.28 + cloudy * 0.2 + fine * 0.14
            : plasticPebble * 0.34 + plasticStipple + cloudy * 0.2 + fine * 0.14
      const bumpValue = 0.5 + detail * profile.detailStrength
      const roughnessValue =
        profile.roughness + detail * profile.roughnessVariance
      const value = clamp01(channel === "bump" ? bumpValue : roughnessValue)
      const color = Math.round(value * 255)

      data[i] = color
      data[i + 1] = color
      data[i + 2] = color
      data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.name = `${profile.label} ${channel} detail`
  texture.userData.sourceUrl = profile.sourceUrl
  texture.colorSpace = THREE.NoColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(profile.repeat, profile.repeat)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

const getComponentTextureMaps = (
  kind: ComponentMaterialKind,
): ComponentTextureMaps | null => {
  if (typeof document === "undefined") return null
  const cached = componentTextureCache.get(kind)
  if (cached) return cached

  const bumpMap = createMapTexture(kind, "bump")
  const roughnessMap = createMapTexture(kind, "roughness")
  if (!bumpMap || !roughnessMap) return null

  const maps = { bumpMap, roughnessMap }
  componentTextureCache.set(kind, maps)
  return maps
}

export const getComponentMaterialKind = (
  material: THREE.MeshStandardMaterial,
  meshName: string,
): ComponentMaterialKind => {
  const descriptor = `${material.name} ${meshName}`.toLowerCase()
  const isNamedPlastic =
    /plastic|keycap|button|housing|case|resin|epoxy|rubber|insulator/.test(
      descriptor,
    )

  if (/pin|lead|terminal|contact|solder|wire|leg/.test(descriptor)) {
    return "pin"
  }

  if (material.metalness >= 0.45) {
    return "metal"
  }

  if (
    /metal|copper|gold|silver|tin|nickel|steel|alum|chrome|brass|shield|shell/.test(
      descriptor,
    )
  ) {
    return "metal"
  }

  const hsl = { h: 0, s: 0, l: 0 }
  material.color.getHSL(hsl)
  const isNeutralMetalColor = hsl.s < 0.18 && hsl.l > 0.34 && hsl.l < 0.88
  const isGoldOrCopperColor =
    material.color.r > 0.55 &&
    material.color.g > 0.35 &&
    material.color.b < 0.32 &&
    material.color.r > material.color.b * 1.8

  if (!isNamedPlastic && isGoldOrCopperColor) {
    return "pin"
  }

  if (!isNamedPlastic && isNeutralMetalColor) {
    return "metal"
  }

  return "plastic"
}

export const normalizeComponentMaterial = (
  material: THREE.Material,
): THREE.MeshStandardMaterial => {
  if (material instanceof THREE.MeshStandardMaterial) {
    return material
  }

  const source = material as THREE.Material & {
    color?: THREE.Color
    map?: THREE.Texture | null
    emissive?: THREE.Color
    emissiveIntensity?: number
    specular?: THREE.Color
    shininess?: number
    vertexColors?: boolean
  }

  const roughness =
    typeof source.shininess === "number"
      ? clamp01(1 - Math.min(source.shininess, 100) / 100)
      : 0.62

  const standardMaterial = new THREE.MeshStandardMaterial({
    name: material.name,
    color: source.color?.clone() ?? new THREE.Color(0x888888),
    map: source.map ?? null,
    transparent: material.transparent,
    opacity: material.opacity,
    side: material.side,
    alphaTest: material.alphaTest,
    depthWrite: material.depthWrite,
    vertexColors: source.vertexColors ?? false,
    roughness,
    metalness: 0,
  })

  if (source.emissive) {
    standardMaterial.emissive.copy(source.emissive)
    standardMaterial.emissiveIntensity = source.emissiveIntensity ?? 1
  }

  material.dispose()
  return standardMaterial
}

export const applyComponentMaterialTextureProfile = ({
  material,
  meshName,
  renderingMode,
  environmentMap,
  defaultEnvMapIntensity,
  realisticEnvMapIntensity,
}: {
  material: THREE.MeshStandardMaterial
  meshName: string
  renderingMode: RenderingMode
  environmentMap: THREE.Texture | null
  defaultEnvMapIntensity: number
  realisticEnvMapIntensity: number
}): ComponentMaterialProfileSnapshot => {
  const snapshot: ComponentMaterialProfileSnapshot = {
    material,
    envMap: material.envMap ?? null,
    envMapIntensity: material.envMapIntensity ?? 1,
    metalness: material.metalness,
    roughness: material.roughness,
    roughnessMap: material.roughnessMap ?? null,
    bumpMap: material.bumpMap ?? null,
    bumpScale: material.bumpScale,
  }

  if (environmentMap) {
    material.envMap = environmentMap
    const targetEnvMapIntensity =
      renderingMode === "realistic"
        ? realisticEnvMapIntensity
        : defaultEnvMapIntensity
    if (material.envMapIntensity < targetEnvMapIntensity) {
      material.envMapIntensity = targetEnvMapIntensity
    }
  }

  if (renderingMode === "realistic") {
    const kind = getComponentMaterialKind(material, meshName)
    const profile = COMPONENT_MATERIAL_TEXTURE_PROFILES[kind]
    const maps = getComponentTextureMaps(kind)

    if (maps) {
      material.bumpMap = maps.bumpMap
      material.roughnessMap = maps.roughnessMap
      material.bumpScale = profile.bumpScale
    }

    if (kind === "metal" || kind === "pin") {
      material.metalness = Math.max(material.metalness ?? 0, profile.metalness)
      material.roughness = Math.min(
        material.roughness ?? profile.roughness,
        profile.roughness,
      )
    } else {
      material.metalness = Math.min(material.metalness ?? 0, profile.metalness)
      material.roughness = clamp01(
        Math.max(material.roughness ?? profile.roughness, profile.roughness),
      )
    }
  }

  material.needsUpdate = true
  return snapshot
}

export const restoreComponentMaterialTextureProfile = ({
  material,
  envMap,
  envMapIntensity,
  metalness,
  roughness,
  roughnessMap,
  bumpMap,
  bumpScale,
}: ComponentMaterialProfileSnapshot) => {
  material.envMap = envMap
  material.envMapIntensity = envMapIntensity
  material.metalness = metalness
  material.roughness = roughness
  material.roughnessMap = roughnessMap
  material.bumpMap = bumpMap
  material.bumpScale = bumpScale
  material.needsUpdate = true
}
