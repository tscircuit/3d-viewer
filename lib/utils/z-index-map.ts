export const zIndexMap = {
  clickToInteractOverlay: 100,
  htmlElements: 95,
  orientationCube: 95,
  contextMenu: 90,
  appearanceMenu: 91,
} as const

export type ZIndexKey = keyof typeof zIndexMap
