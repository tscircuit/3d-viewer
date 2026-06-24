export const resolveModelUrl = (
  modelUrl: string | undefined,
  resolveStaticAsset?: (modelUrl: string) => string,
) => {
  if (!modelUrl) return undefined
  return resolveStaticAsset ? resolveStaticAsset(modelUrl) : modelUrl
}
