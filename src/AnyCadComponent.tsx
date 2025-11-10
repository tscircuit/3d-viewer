import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { useMemo, useState, useCallback } from "react"
import { useStlsFromGeom } from "./hooks/use-stls-from-geom"
import { CadViewerContainer } from "./CadViewerContainer"
import { MixedStlModel } from "./three-components/MixedStlModel"
import { Euler } from "three"
import { GltfModel } from "./three-components/GltfModel"
import { JscadModel } from "./three-components/JscadModel"
import { FootprinterModel } from "./three-components/FootprinterModel"
import { tuple } from "./utils/tuple"
import { Html } from "./react-three/Html"
import { useLayerVisibility } from "./contexts/LayerVisibilityContext"

export const AnyCadComponent = ({
  cad_component,
  circuitJson,
  isFauxBoard,
}: {
  cad_component: CadComponent
  circuitJson: AnyCircuitElement[]
  isFauxBoard?: boolean
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const { visibility } = useLayerVisibility()
  const [hoverPosition, setHoverPosition] = useState<
    [number, number, number] | null
  >(null)

  const handleHover = useCallback((e: any) => {
    if (e?.mousePosition) {
      setIsHovered(true)
      setHoverPosition(e.mousePosition)
    } else {
      // If event doesn't have mousePosition, maybe keep previous hover state or clear it
      // For now, let's clear it if the event structure is unexpected
      setIsHovered(false)
      setHoverPosition(null)
    }
  }, [])

  const handleUnhover = useCallback(() => {
    setIsHovered(false)
    setHoverPosition(null)
  }, [])

  const componentName = useMemo(() => {
    return su(circuitJson).source_component.getUsing({
      source_component_id: cad_component.source_component_id,
    })?.name
  }, [circuitJson, cad_component.source_component_id])

  const url =
    cad_component.model_obj_url ??
    cad_component.model_wrl_url ??
    cad_component.model_stl_url
  const gltfUrl = cad_component.model_glb_url ?? cad_component.model_gltf_url
  const rotationOffset = cad_component.rotation
    ? tuple(
        (cad_component.rotation.x * Math.PI) / 180,
        (cad_component.rotation.y * Math.PI) / 180,
        (cad_component.rotation.z * Math.PI) / 180,
      )
    : undefined

  let modelComponent: React.ReactNode = null

  // If this component is being rendered on a faux board, add 0.5mm to the Z
  // position so models sit slightly above the faux board (matches other
  // rendering paths that offset components above the board).
  const computePositionWithFauxOffset = (
    pos?: { x: number; y: number; z?: number } | null,
  ) => {
    if (!pos) return undefined
    const baseZ = typeof pos.z === "number" ? pos.z : 0
    const adjustedZ = isFauxBoard ? baseZ + 0.8 : baseZ
    return [pos.x, pos.y, adjustedZ] as [number, number, number]
  }

  if (url) {
    modelComponent = (
      <MixedStlModel
        key={cad_component.cad_component_id}
        url={url}
        position={computePositionWithFauxOffset(cad_component.position)}
        rotation={rotationOffset}
        scale={cad_component.model_unit_to_mm_scale_factor}
        onHover={handleHover}
        onUnhover={handleUnhover}
        isHovered={isHovered}
      />
    )
  } else if (gltfUrl) {
    modelComponent = (
      <GltfModel
        key={cad_component.cad_component_id}
        gltfUrl={gltfUrl}
        position={computePositionWithFauxOffset(cad_component.position)}
        rotation={rotationOffset}
        scale={cad_component.model_unit_to_mm_scale_factor}
        onHover={handleHover}
        onUnhover={handleUnhover}
        isHovered={isHovered}
      />
    )
  } else if (cad_component.model_jscad) {
    modelComponent = (
      <JscadModel
        key={cad_component.cad_component_id}
        jscadPlan={cad_component.model_jscad as any}
        rotationOffset={rotationOffset}
        scale={cad_component.model_unit_to_mm_scale_factor}
        onHover={handleHover}
        onUnhover={handleUnhover}
        isHovered={isHovered}
      />
    )
  } else if (cad_component.footprinter_string) {
    modelComponent = (
      <FootprinterModel
        positionOffset={computePositionWithFauxOffset(cad_component.position)}
        rotationOffset={rotationOffset}
        footprint={cad_component.footprinter_string}
        scale={cad_component.model_unit_to_mm_scale_factor}
        onHover={handleHover}
        onUnhover={handleUnhover}
        isHovered={isHovered}
      />
    )
  }

  // Check if models should be visible
  if (!visibility.smtModels) {
    return null
  }

  // Render the model and the tooltip if hovered
  return (
    <>
      {modelComponent}
      {isHovered && hoverPosition ? (
        <Html
          position={hoverPosition}
          style={{
            fontFamily: "sans-serif",
            transform: "translate3d(1rem, 1rem, 0)",
            backgroundColor: "white",
            padding: "5px",
            borderRadius: "3px",
            pointerEvents: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
          }}
        >
          {componentName ?? "<unknown>"}
        </Html>
      ) : null}
    </>
  )
}
