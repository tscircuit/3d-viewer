/**
 * Values tuned for a manufactured, ENIG-finished FR-4 board under soft studio
 * lighting. The solder mask has a fine satin texture, while the finished
 * copper stays deliberately less reflective than polished metal.
 */
export const REALISTIC_BOARD_SURFACE_MATERIAL = {
  bumpScale: 0.12,
  normalScale: 0.08,
  // This value is carried by the roughness map directly. Keep the clear coat
  // restrained so the mask looks satin, not mirror-polished.
  roughness: 0.7,
  roughnessBias: 0.015,
  roughnessVariance: 0.025,
  clearcoat: 0.08,
  clearcoatRoughness: 0.55,
  detailStrength: 0.035,
}

export const PAD_COPPER_TEXTURE_MATERIAL = {
  roughness: 0.42,
  metalness: 0.5,
  roughnessVariance: 0.035,
  detailStrength: 0.028,
}
