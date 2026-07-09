export type BoardSurfaceTextureId =
  | "PaintSubstance001"
  | "Wallpaper001A"
  | "Concrete030"
  | "Plaster002"
  | "Fabric019"
  | "Leather039"
  | "Leather035D"
  | "Leather028"
  | "Asphalt023S"
  | "Road010A"
  | "Rubber004"
  | "Plastic010"
  | "Road014A"
  | "Concrete036"
  | "Plaster003"
  | "Plastic012B"
  | "Ivory002A"
  | "Paper001"
  | "Paper006"

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
    id: "PaintSubstance001",
    label: "Paint Substance 001",
    sourceUrl: "https://ambientcg.com/view?id=PaintSubstance001",
    material: {
      bumpScale: 0.7,
      normalScale: 1.14,
      roughness: 0.62,
      roughnessBias: 0.08,
      roughnessVariance: 0.07,
      clearcoat: 0.1,
      clearcoatRoughness: 0.78,
      detailStrength: 0.034,
    },
  },
  {
    id: "Wallpaper001A",
    label: "Wallpaper 001 A",
    sourceUrl: "https://ambientcg.com/view?id=Wallpaper001A",
    material: {
      bumpScale: 0.78,
      normalScale: 1.22,
      roughness: 0.62,
      roughnessBias: 0.08,
      roughnessVariance: 0.08,
      clearcoat: 0.12,
      clearcoatRoughness: 0.8,
      detailStrength: 0.042,
    },
  },
  {
    id: "Concrete030",
    label: "Concrete 030",
    sourceUrl: "https://ambientcg.com/view?id=Concrete030",
    material: {
      bumpScale: 0.9,
      normalScale: 1.28,
      roughness: 0.68,
      roughnessBias: 0.12,
      roughnessVariance: 0.12,
      clearcoat: 0.08,
      clearcoatRoughness: 0.86,
      detailStrength: 0.05,
    },
  },
  {
    id: "Plaster002",
    label: "Plaster 002",
    sourceUrl: "https://ambientcg.com/view?id=Plaster002",
    material: {
      bumpScale: 1.0,
      normalScale: 1.34,
      roughness: 0.74,
      roughnessBias: 0.16,
      roughnessVariance: 0.13,
      clearcoat: 0.05,
      clearcoatRoughness: 0.92,
      detailStrength: 0.065,
    },
  },
  {
    id: "Fabric019",
    label: "Fabric 019",
    sourceUrl: "https://ambientcg.com/view?id=Fabric019",
    material: {
      bumpScale: 0.86,
      normalScale: 1.3,
      roughness: 0.72,
      roughnessBias: 0.14,
      roughnessVariance: 0.1,
      clearcoat: 0.04,
      clearcoatRoughness: 0.9,
      detailStrength: 0.052,
    },
  },
  {
    id: "Leather039",
    label: "Leather 039",
    sourceUrl: "https://ambientcg.com/view?id=Leather039",
    material: {
      bumpScale: 0.82,
      normalScale: 1.26,
      roughness: 0.68,
      roughnessBias: 0.12,
      roughnessVariance: 0.1,
      clearcoat: 0.06,
      clearcoatRoughness: 0.88,
      detailStrength: 0.05,
    },
  },
  {
    id: "Leather035D",
    label: "Leather 035 D",
    sourceUrl: "https://ambientcg.com/view?id=Leather035D",
    material: {
      bumpScale: 0.74,
      normalScale: 1.18,
      roughness: 0.6,
      roughnessBias: 0.08,
      roughnessVariance: 0.08,
      clearcoat: 0.12,
      clearcoatRoughness: 0.74,
      detailStrength: 0.04,
    },
  },
  {
    id: "Leather028",
    label: "Leather 028",
    sourceUrl: "https://ambientcg.com/view?id=Leather028",
    material: {
      bumpScale: 0.9,
      normalScale: 1.32,
      roughness: 0.66,
      roughnessBias: 0.1,
      roughnessVariance: 0.12,
      clearcoat: 0.08,
      clearcoatRoughness: 0.82,
      detailStrength: 0.056,
    },
  },
  {
    id: "Asphalt023S",
    label: "Asphalt 023 S",
    sourceUrl: "https://ambientcg.com/view?id=Asphalt023S",
    material: {
      bumpScale: 1.08,
      normalScale: 1.42,
      roughness: 0.78,
      roughnessBias: 0.18,
      roughnessVariance: 0.18,
      clearcoat: 0.03,
      clearcoatRoughness: 0.94,
      detailStrength: 0.078,
    },
  },
  {
    id: "Road010A",
    label: "Road 010 A",
    sourceUrl: "https://ambientcg.com/view?id=Road010A",
    material: {
      bumpScale: 1.12,
      normalScale: 1.44,
      roughness: 0.8,
      roughnessBias: 0.18,
      roughnessVariance: 0.18,
      clearcoat: 0.03,
      clearcoatRoughness: 0.96,
      detailStrength: 0.082,
    },
  },
  {
    id: "Rubber004",
    label: "Rubber 004",
    sourceUrl: "https://ambientcg.com/view?id=Rubber004",
    material: {
      bumpScale: 0.96,
      normalScale: 1.34,
      roughness: 0.72,
      roughnessBias: 0.14,
      roughnessVariance: 0.14,
      clearcoat: 0.08,
      clearcoatRoughness: 0.86,
      detailStrength: 0.064,
    },
  },
  {
    id: "Plastic010",
    label: "Plastic 010",
    sourceUrl: "https://ambientcg.com/view?id=Plastic010",
    material: {
      bumpScale: 0.62,
      normalScale: 1.06,
      roughness: 0.5,
      roughnessBias: 0,
      roughnessVariance: 0.05,
      clearcoat: 0.22,
      clearcoatRoughness: 0.68,
      detailStrength: 0.026,
    },
  },
  {
    id: "Road014A",
    label: "Road 014 A",
    sourceUrl: "https://ambientcg.com/view?id=Road014A",
    material: {
      bumpScale: 1.04,
      normalScale: 1.36,
      roughness: 0.76,
      roughnessBias: 0.16,
      roughnessVariance: 0.16,
      clearcoat: 0.04,
      clearcoatRoughness: 0.92,
      detailStrength: 0.066,
    },
  },
  {
    id: "Concrete036",
    label: "Concrete 036",
    sourceUrl: "https://ambientcg.com/view?id=Concrete036",
    material: {
      bumpScale: 0.94,
      normalScale: 1.28,
      roughness: 0.72,
      roughnessBias: 0.14,
      roughnessVariance: 0.14,
      clearcoat: 0.06,
      clearcoatRoughness: 0.9,
      detailStrength: 0.056,
    },
  },
  {
    id: "Plaster003",
    label: "Plaster 003",
    sourceUrl: "https://ambientcg.com/view?id=Plaster003",
    material: {
      bumpScale: 1.05,
      normalScale: 1.38,
      roughness: 0.76,
      roughnessBias: 0.18,
      roughnessVariance: 0.15,
      clearcoat: 0.05,
      clearcoatRoughness: 0.92,
      detailStrength: 0.072,
    },
  },
  {
    id: "Plastic012B",
    label: "Plastic 012 B",
    sourceUrl: "https://ambientcg.com/view?id=Plastic012B",
    material: {
      bumpScale: 0.76,
      normalScale: 1.2,
      roughness: 0.56,
      roughnessBias: 0.04,
      roughnessVariance: 0.09,
      clearcoat: 0.18,
      clearcoatRoughness: 0.76,
      detailStrength: 0.04,
    },
  },
  {
    id: "Ivory002A",
    label: "Ivory 002 A",
    sourceUrl: "https://ambientcg.com/view?id=Ivory002A",
    material: {
      bumpScale: 0.52,
      normalScale: 1.02,
      roughness: 0.5,
      roughnessBias: 0.03,
      roughnessVariance: 0.06,
      clearcoat: 0.16,
      clearcoatRoughness: 0.7,
      detailStrength: 0.028,
    },
  },
  {
    id: "Paper001",
    label: "Paper 001",
    sourceUrl: "https://ambientcg.com/view?id=Paper001",
    material: {
      bumpScale: 0.68,
      normalScale: 1.16,
      roughness: 0.7,
      roughnessBias: 0.12,
      roughnessVariance: 0.1,
      clearcoat: 0.02,
      clearcoatRoughness: 0.94,
      detailStrength: 0.046,
    },
  },
  {
    id: "Paper006",
    label: "Paper 006",
    sourceUrl: "https://ambientcg.com/view?id=Paper006",
    material: {
      bumpScale: 0.78,
      normalScale: 1.22,
      roughness: 0.76,
      roughnessBias: 0.16,
      roughnessVariance: 0.12,
      clearcoat: 0.02,
      clearcoatRoughness: 0.96,
      detailStrength: 0.058,
    },
  },
]

export const DEFAULT_BOARD_SURFACE_TEXTURE_ID: BoardSurfaceTextureId =
  "Plastic010"

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
