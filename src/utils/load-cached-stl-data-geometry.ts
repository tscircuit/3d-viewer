import type { BufferGeometry } from "three"

const stlDataGeometryCache = new WeakMap<ArrayBuffer, BufferGeometry>()

export function loadCachedStlDataGeometry(
  stlData: ArrayBuffer,
  parseStlData: (stlData: ArrayBuffer) => BufferGeometry,
): BufferGeometry {
  let cachedGeometry = stlDataGeometryCache.get(stlData)
  if (!cachedGeometry) {
    cachedGeometry = parseStlData(stlData)
    stlDataGeometryCache.set(stlData, cachedGeometry)
  }

  return cachedGeometry.clone()
}
