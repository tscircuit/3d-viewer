import type { PcbTrace } from "circuit-json"

export function isWireRoutePoint(
  point: any,
): point is { x: number; y: number; width: number; layer: string } {
  return (
    point &&
    point.route_type === "wire" &&
    typeof point.layer === "string" &&
    typeof point.width === "number"
  )
}

export function splitTraceIntoLayerSegments(
  trace: PcbTrace,
  layer: "top" | "bottom",
): PcbTrace[] {
  const segments: PcbTrace[] = []
  let currentRoute: PcbTrace["route"] = []

  const pushCurrentSegment = () => {
    if (currentRoute.length < 2) {
      currentRoute = []
      return
    }

    segments.push({
      ...trace,
      pcb_trace_id: `${trace.pcb_trace_id}_${layer}_${segments.length}`,
      route: currentRoute,
    })
    currentRoute = []
  }

  for (const point of trace.route) {
    if (!isWireRoutePoint(point)) {
      pushCurrentSegment()
      continue
    }

    if (point.layer !== layer) {
      pushCurrentSegment()
      continue
    }

    currentRoute.push(point)
  }

  pushCurrentSegment()
  return segments
}
