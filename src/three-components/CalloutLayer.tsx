import type { AnyCircuitElement, CadComponent } from "circuit-json"
import React, { useEffect, useMemo, useRef, useState } from "react"
import ReactDOM from "react-dom"
import * as THREE from "three"
import { zIndexMap } from "../../lib/utils/z-index-map"
import type { CadViewerCallout } from "../presentation-types"
import { useFrame, useThree } from "../react-three/ThreeContext"

type ProjectedCallout = CadViewerCallout & {
  key: string
  anchorX: number
  anchorY: number
  labelX: number
  labelY: number
  labelWidth: number
  visible: boolean
}

type CalloutLayerProps = {
  callouts?: CadViewerCallout[]
  circuitJson: AnyCircuitElement[]
  cadComponents: CadComponent[]
  boardDimensions?: { width?: number; height?: number }
  boardCenter?: { x: number; y: number }
}

const defaultOffsets = [
  { x: 80, y: -72 },
  { x: -210, y: -42 },
  { x: 72, y: 74 },
]

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const positionToVector = (
  position: CadViewerCallout["position"],
): THREE.Vector3 | null => {
  if (!position) return null
  if (Array.isArray(position)) {
    return new THREE.Vector3(position[0], position[1], position[2])
  }
  return new THREE.Vector3(position.x, position.y, position.z ?? 0)
}

export const CalloutLayer = ({
  callouts,
  circuitJson,
  cadComponents,
  boardDimensions,
  boardCenter,
}: CalloutLayerProps) => {
  const { camera, renderer } = useThree()
  const overlayRef = useRef(document.createElement("div"))
  const [portalReady, setPortalReady] = useState(false)
  const [projectedCallouts, setProjectedCallouts] = useState<
    ProjectedCallout[]
  >([])

  const sourceNameById = useMemo(() => {
    const sourceNames = new Map<string, string>()
    for (const element of circuitJson) {
      if (element.type !== "source_component") continue
      const sourceComponent = element as AnyCircuitElement & {
        source_component_id?: string
        name?: string
      }
      if (sourceComponent.source_component_id && sourceComponent.name) {
        sourceNames.set(
          sourceComponent.source_component_id,
          sourceComponent.name,
        )
      }
    }
    return sourceNames
  }, [circuitJson])

  const effectiveCallouts = useMemo<CadViewerCallout[]>(() => {
    if (callouts?.length) return callouts

    const centerX = boardCenter?.x ?? 0
    const centerY = boardCenter?.y ?? 0
    const width = boardDimensions?.width ?? 40
    const height = boardDimensions?.height ?? 30

    return [
      {
        target: cadComponents[0]?.source_component_id,
        position: cadComponents[0]?.position
          ? [
              cadComponents[0].position.x,
              cadComponents[0].position.y,
              (cadComponents[0].position.z ?? 0) + 4,
            ]
          : [centerX - width * 0.25, centerY + height * 0.18, 4],
        title: "High Fidelity",
        body: "Real PCB geometry and CAD models",
      },
      {
        position: [centerX + width * 0.25, centerY, 3],
        title: "Layer Awareness",
        body: "Copper, mask, silkscreen from Circuit JSON",
      },
      {
        position: [centerX, centerY - height * 0.28, 3],
        title: "Hero Camera",
        body: "Studio lighting on the real board",
      },
    ]
  }, [boardCenter, boardDimensions, cadComponents, callouts])

  const worldAnchors = useMemo(() => {
    return effectiveCallouts.map((callout) => {
      const explicitPosition = positionToVector(callout.position)
      if (explicitPosition) return explicitPosition

      const target = callout.target
      const cadComponent = target
        ? cadComponents.find((component) => {
            const sourceName = sourceNameById.get(component.source_component_id)
            return (
              component.cad_component_id === target ||
              component.pcb_component_id === target ||
              component.source_component_id === target ||
              sourceName === target
            )
          })
        : undefined

      if (cadComponent?.position) {
        return new THREE.Vector3(
          cadComponent.position.x,
          cadComponent.position.y,
          (cadComponent.position.z ?? 0) + 4,
        )
      }

      return new THREE.Vector3(boardCenter?.x ?? 0, boardCenter?.y ?? 0, 4)
    })
  }, [boardCenter, cadComponents, effectiveCallouts, sourceNameById])

  useEffect(() => {
    const rendererNode = renderer?.domElement.parentNode as HTMLElement | null
    if (!rendererNode) return

    if (
      rendererNode.style.position !== "relative" &&
      rendererNode.style.position !== "absolute"
    ) {
      rendererNode.style.position = "relative"
    }

    const overlay = overlayRef.current
    overlay.style.position = "absolute"
    overlay.style.inset = "0"
    overlay.style.pointerEvents = "none"
    overlay.style.zIndex = zIndexMap.htmlElements.toString()
    rendererNode.appendChild(overlay)
    setPortalReady(true)

    return () => {
      setPortalReady(false)
      if (rendererNode.contains(overlay)) {
        rendererNode.removeChild(overlay)
      }
    }
  }, [renderer])

  useFrame(() => {
    if (!camera || !renderer) return

    const rect = renderer.domElement.getBoundingClientRect()
    const canvasWidth = renderer.domElement.clientWidth || rect.width
    const canvasHeight = renderer.domElement.clientHeight || rect.height
    const viewportWidth = Math.min(
      canvasWidth,
      window.innerWidth || canvasWidth,
    )
    const viewportHeight = Math.min(
      canvasHeight,
      window.innerHeight || canvasHeight,
    )
    setProjectedCallouts(
      effectiveCallouts.map((callout, index) => {
        const projected = worldAnchors[index].clone().project(camera)
        const anchorX = ((projected.x + 1) / 2) * canvasWidth
        const anchorY = ((-projected.y + 1) / 2) * canvasHeight
        const offset = callout.labelOffset ?? defaultOffsets[index % 3]
        const labelWidth = Math.min(190, Math.max(150, viewportWidth - 24))
        let labelX = clamp(
          anchorX + offset.x,
          12,
          viewportWidth - labelWidth - 12,
        )
        let labelY = clamp(anchorY + offset.y, 36, viewportHeight - 92)

        if (viewportWidth < 520) {
          const mobileSlots = [204, 294, 454]
          labelX = 12
          labelY = clamp(mobileSlots[index] ?? labelY, 36, viewportHeight - 92)
        }

        return {
          ...callout,
          key: `${callout.target ?? "position"}-${callout.title}-${index}`,
          anchorX,
          anchorY,
          labelX,
          labelY,
          labelWidth,
          visible:
            projected.z >= -1 &&
            projected.z <= 1 &&
            anchorX > -120 &&
            anchorY > -80 &&
            anchorX < canvasWidth + 120 &&
            anchorY < canvasHeight + 80,
        }
      }),
    )
  }, [camera, renderer, effectiveCallouts, worldAnchors])

  if (!portalReady) return null

  return ReactDOM.createPortal(
    <>
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
        }}
      >
        {projectedCallouts.map((callout) =>
          callout.visible ? (
            <g key={`${callout.key}-line`}>
              <circle
                cx={callout.anchorX}
                cy={callout.anchorY}
                r={3.5}
                fill="#f8fbff"
                stroke="#7dd3fc"
                strokeWidth={1.5}
              />
              <path
                d={`M ${callout.anchorX} ${callout.anchorY} L ${callout.labelX + callout.labelWidth / 2} ${callout.labelY + 34}`}
                stroke="#9ee7ff"
                strokeWidth={1.25}
                strokeLinecap="round"
                strokeDasharray="4 5"
                fill="none"
                opacity={0.82}
              />
            </g>
          ) : null,
        )}
      </svg>
      {projectedCallouts.map((callout) =>
        callout.visible ? (
          <div
            key={callout.key}
            style={{
              position: "absolute",
              left: callout.labelX,
              top: callout.labelY,
              width: callout.labelWidth,
              boxSizing: "border-box",
              color: "#f8fbff",
              background: "rgba(8, 15, 30, 0.72)",
              border: "1px solid rgba(158, 231, 255, 0.35)",
              boxShadow:
                "0 12px 32px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
              borderRadius: 8,
              padding: "9px 11px",
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1.15,
                marginBottom: callout.body ? 4 : 0,
              }}
            >
              {callout.title}
            </div>
            {callout.body ? (
              <div
                style={{
                  fontSize: 11,
                  lineHeight: 1.35,
                  color: "rgba(248, 251, 255, 0.76)",
                }}
              >
                {callout.body}
              </div>
            ) : null}
          </div>
        ) : null,
      )}
    </>,
    overlayRef.current,
  )
}
