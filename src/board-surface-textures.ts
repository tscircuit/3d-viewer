export type BoardSurfaceTextureId = "Leather039"

export interface BoardSurfaceTextureOption {
  id: BoardSurfaceTextureId
  label: string
  sourceUrl: string
  material: {
    bumpScale: number
    normalScale: number
    roughness: number
    roughnessBias: number
    roughnessVariance: number
    clearcoat: number
    clearcoatRoughness: number
    detailStrength: number
  }
}

export const BOARD_SURFACE_TEXTURE_OPTIONS: BoardSurfaceTextureOption[] = [
  {
    id: "Leather039",
    label: "Realistic Board Fixture",
    sourceUrl: "https://ambientcg.com/view?id=Leather039",
    material: {
      bumpScale: 1.1,
      normalScale: 0.26,
      roughness: 0.48,
      roughnessBias: 0.12,
      roughnessVariance: 0.0,
      clearcoat: 0.6,
      clearcoatRoughness: 1.88,
      detailStrength: 0.0,
    },
  },
]

export const DEFAULT_BOARD_SURFACE_TEXTURE_ID: BoardSurfaceTextureId =
  "Leather039"

export const isBoardSurfaceTextureId = (
  value: string | null | undefined,
): value is BoardSurfaceTextureId =>
  BOARD_SURFACE_TEXTURE_OPTIONS.some((option) => option.id === value)

export const getBoardSurfaceTextureOption = (
  id: BoardSurfaceTextureId,
): BoardSurfaceTextureOption =>
  BOARD_SURFACE_TEXTURE_OPTIONS.find((option) => option.id === id) ??
  BOARD_SURFACE_TEXTURE_OPTIONS.find(
    (option) => option.id === DEFAULT_BOARD_SURFACE_TEXTURE_ID,
  )!

export type PadCopperTextureId = "Metal048A"

export interface PadCopperTextureProfile {
  id: PadCopperTextureId
  label: string
  sourceUrl: string
  material: {
    roughness: number
    roughnessVariance: number
    detailStrength: number
  }
}

export const DEFAULT_PAD_COPPER_TEXTURE_ID: PadCopperTextureId = "Metal048A"

export const PAD_COPPER_TEXTURE_PROFILE: PadCopperTextureProfile = {
  id: DEFAULT_PAD_COPPER_TEXTURE_ID,
  label: "Metal 048 A",
  sourceUrl: "https://ambientcg.com/view?id=Metal048A",
  material: {
    roughness: 0.24,
    roughnessVariance: 0.06,
    detailStrength: 0.02,
  },
}

export const getPadCopperTextureProfile = (): PadCopperTextureProfile =>
  PAD_COPPER_TEXTURE_PROFILE
