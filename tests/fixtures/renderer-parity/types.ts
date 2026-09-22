import type { AnyCircuitElement } from "circuit-json"

export type ComparisonView = "oblique" | "side"
export type CalibrationMutation =
  | "none"
  | "origin-shift"
  | "reverse-x"
  | "wrong-order"

export interface PreparedComparison {
  id: string
  title: string
  description: string
  category: "control" | "rotation" | "origin" | "format" | "real"
  targetCadId: string
  circuitJson: AnyCircuitElement[]
  glbUrl?: string
  exportError?: string
  exportMessages: string[]
  camera: {
    target: [number, number, number]
    span: number
    fromBelow?: boolean
  }
}

export interface ComparisonManifest {
  exporterVersion: string
  cases: PreparedComparison[]
}

export interface GeometryCapture {
  width: number
  height: number
  leftPng: string
  rightPng?: string
  exportError?: string
  exportMessages: string[]
  metadata: {
    caseId: string
    view: ComparisonView
    mutation?: CalibrationMutation
    cameraPosition: number[]
    cameraTarget: number[]
    cameraSpan: number
    cameraFromBelow: boolean
    viewerVertexCount: number
    exporterVertexCount?: number
    viewerRotation: number[]
  }
}

export interface RendererComparisonApi {
  status: "loading" | "ready" | "error"
  caseId: string
  error?: string
  captureGeometry: (
    view: ComparisonView,
    calibration?: CalibrationMutation,
  ) => Promise<GeometryCapture>
}

declare global {
  interface Window {
    rendererComparison?: RendererComparisonApi
  }
}
