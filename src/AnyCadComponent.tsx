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
  pcbThickness = 1.4,
}: {
  cad_component: CadComponent
  circuitJson: AnyCircuitElement[]
  pcbThickness?: number
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

  const isThroughHole = useMemo(() => {
    const platedHoles = circuitJson.filter(
      (elm) =>
        elm.type === "pcb_plated_hole" &&
        elm.pcb_component_id === cad_component.pcb_component_id,
    )
    return platedHoles.length > 0
  }, [circuitJson, cad_component.pcb_component_id])

  // Get the component's layer to determine correct Z position
  const componentLayer = useMemo(() => {
    const pcbComponent = circuitJson.find(
      (elm) =>
        elm.type === "pcb_component" &&
        elm.pcb_component_id === cad_component.pcb_component_id,
    )
    if (pcbComponent && "layer" in pcbComponent) {
      return pcbComponent.layer as "top" | "bottom"
    }
    return "top" // Default to top layer
  }, [circuitJson, cad_component.pcb_component_id])

  // Compute corrected position - fix Z when it's 0 (panel case)
  const correctedPosition = useMemo(() => {
    if (!cad_component.position) return undefined

    const { x, y, z } = cad_component.position
    // If Z is 0 or very close to 0, it likely means the board thickness wasn't
    // available when @tscircuit/core computed the position (e.g., panels).
    // In this case, compute the correct Z based on the layer and pcbThickness.
    const needsZCorrection = Math.abs(z) < 0.001
    const correctedZ = needsZCorrection
      ? componentLayer === "bottom"
        ? -pcbThickness / 2
        : pcbThickness / 2
      : z

    return [x, y, correctedZ] as [number, number, number]
  }, [cad_component.position, componentLayer, pcbThickness])

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

  if (url) {
    modelComponent = (
      <MixedStlModel
        key={cad_component.cad_component_id}
        url={url}
        position={correctedPosition}
        rotation={rotationOffset}
        scale={cad_component.model_unit_to_mm_scale_factor}
        onHover={handleHover}
        onUnhover={handleUnhover}
        isHovered={isHovered}
        isTranslucent={cad_component.show_as_translucent_model}
      />
    )
  } else if (gltfUrl) {
    modelComponent = (
      <GltfModel
        key={cad_component.cad_component_id}
        gltfUrl={gltfUrl}
        position={correctedPosition}
        rotation={rotationOffset}
        scale={cad_component.model_unit_to_mm_scale_factor}
        onHover={handleHover}
        onUnhover={handleUnhover}
        isHovered={isHovered}
        isTranslucent={cad_component.show_as_translucent_model}
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
        isTranslucent={cad_component.show_as_translucent_model}
      />
    )
  } else if (cad_component.footprinter_string) {
    modelComponent = (
      <FootprinterModel
        positionOffset={correctedPosition}
        rotationOffset={rotationOffset}
        footprint={cad_component.footprinter_string}
        scale={cad_component.model_unit_to_mm_scale_factor}
        onHover={handleHover}
        onUnhover={handleUnhover}
        isHovered={isHovered}
        isTranslucent={cad_component.show_as_translucent_model}
      />
    )
  }

  // Check if models should be visible
  // Translucent models are controlled only by translucent visibility
  if (cad_component.show_as_translucent_model) {
    if (!visibility.translucentModels) {
      return null
    }
  } else {
    // Non-translucent models are controlled by SMT/through-hole visibility
    if (isThroughHole && !visibility.throughHoleModels) {
      return null
    }
    if (!isThroughHole && !visibility.smtModels) {
      return null
    }
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
