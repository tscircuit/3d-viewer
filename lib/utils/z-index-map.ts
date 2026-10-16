export const zIndexMap = {
  clickToInteractOverlay: 100,
  htmlElements: 95,
  orientationCube: 95,
  explodedViewControl: 96,
  contextMenu: 110,
  appearanceMenu: 111,
} as const

export type ZIndexKey = keyof typeof zIndexMap
