import { su } from "@tscircuit/circuit-json-util"
import type {
  AnyCircuitElement,
  CadComponent,
  PcbComponent,
} from "circuit-json"
import { useCallback, useMemo, useState } from "react"
import { useLayerVisibility } from "./contexts/LayerVisibilityContext"
import { usePcbThickness } from "./hooks/usePcbThickness"
import { Html } from "./react-three/Html"
import { FootprinterModel } from "./three-components/FootprinterModel"
import { GltfModel } from "./three-components/GltfModel"
import { JscadModel } from "./three-components/JscadModel"
import { MixedStlModel } from "./three-components/MixedStlModel"
import { StepModel } from "./three-components/StepModel"
import { resolveModelUrl } from "./utils/resolve-model-url"
import { tuple } from "./utils/tuple"

export const AnyCadComponent = ({
  cad_component,
  circuitJson,
  resolveStaticAsset,
}: {
  cad_component: CadComponent
  circuitJson: AnyCircuitElement[]
  resolveStaticAsset?: (modelUrl: string) => string
}) => {
  const pcbThickness = usePcbThickness(circuitJson)
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

  const resolveModelUrlWithStaticResolver = useCallback(
    (modelUrl?: string) => resolveModelUrl(modelUrl, resolveStaticAsset),
    [resolveStaticAsset],
  )

  const url = resolveModelUrlWithStaticResolver(
    cad_component.model_obj_url ??
      cad_component.model_wrl_url ??
      cad_component.model_stl_url,
  )
  const gltfUrl = resolveModelUrlWithStaticResolver(
    cad_component.model_glb_url ?? cad_component.model_gltf_url,
  )
  const stepUrl = resolveModelUrlWithStaticResolver(
    cad_component.model_step_url,
  )
  const pcbComponent = circuitJson.find(
    (elm) =>
      elm.type === "pcb_component" &&
      elm.source_component_id === cad_component.source_component_id,
  ) as PcbComponent | undefined
  const layer = pcbComponent?.layer ?? "top"

  // For bottom layer, flip component 180° around X axis
  const rotationOffset = useMemo(() => {
    const baseRotation = cad_component.rotation
      ? tuple(
          (cad_component.rotation.x * Math.PI) / 180,
          (cad_component.rotation.y * Math.PI) / 180,
          (cad_component.rotation.z * Math.PI) / 180,
        )
      : tuple(0, 0, 0)

    if (layer === "bottom") {
      // Flip 180° around X axis for bottom layer components
      // tscircuit/core already rotates the components
      // return tuple(baseRotation[0] + Math.PI, baseRotation[1], -baseRotation[2])
    }
    return baseRotation
  }, [cad_component.rotation, layer])

  // Adjust position based on layer to place components on top/bottom of board
  const adjustedPosition = useMemo(() => {
    if (!cad_component.position) return undefined
    let z: number
    if (layer === "top") {
      z = cad_component.position.z - pcbThickness / 2
    } else if (layer === "bottom") {
      z = -(cad_component.position.z + pcbThickness)
    } else {
      z = cad_component.position.z // Fallback
    }
    return [cad_component.position.x, cad_component.position.y, z] as [
      number,
      number,
      number,
    ]
  }, [cad_component.position, layer, pcbThickness])

  let modelComponent: React.ReactNode = null

  if (url) {
    modelComponent = (
      <MixedStlModel
        key={cad_component.cad_component_id}
        url={url}
        position={adjustedPosition}
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
        position={adjustedPosition}
        rotation={rotationOffset}
        scale={cad_component.model_unit_to_mm_scale_factor}
        onHover={handleHover}
        onUnhover={handleUnhover}
        isHovered={isHovered}
        isTranslucent={cad_component.show_as_translucent_model}
      />
    )
  } else if (
    stepUrl &&
    !cad_component.model_jscad &&
    !cad_component.footprinter_string
  ) {
    modelComponent = (
      <StepModel
        stepUrl={stepUrl}
        position={adjustedPosition}
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
        positionOffset={adjustedPosition}
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
        positionOffset={adjustedPosition}
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
