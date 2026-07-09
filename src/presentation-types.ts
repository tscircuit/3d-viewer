export type CadViewerVisualStyle = "engineering" | "presentation"

export type CadViewerBackground = "transparent" | "studio"

export type CadViewerCalloutPosition =
  | readonly [number, number, number]
  | {
      x: number
      y: number
      z?: number
    }

export type CadViewerCallout = {
  target?: string
  position?: CadViewerCalloutPosition
  title: string
  body?: string
  labelOffset?: {
    x: number
    y: number
  }
}
