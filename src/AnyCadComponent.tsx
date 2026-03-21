import { su } from "@tscircuit/circuit-json-util"
import type {
  AnyCircuitElement,
  CadComponent,
  PcbComponent,
} from "circuit-json"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useLayerVisibility } from "./contexts/LayerVisibilityContext"
import { usePcbThickness } from "./hooks/usePcbThickness"
import { Html } from "./react-three/Html"
import { FootprinterModel } from "./three-components/FootprinterModel"
import { GltfModel } from "./three-components/GltfModel"
import { JscadModel } from "./three-components/JscadModel"
import { MixedStlModel } from "./three-components/MixedStlModel"
import { StepModel } from "./three-components/StepModel"
import {
  getCadLoaderTransformConfig,
  getCadLoaderTransformMatrix,
} from "./utils/cad-model-loader-transform"
import { getCadModelTransform } from "./utils/cad-model-transform"
import {
  type CadModelType,
  getCadModelType,
  getRenderedCadModelType,
} from "./utils/get-cad-model-type"
import { resolveModelUrl } from "./utils/resolve-model-url"
import { tuple } from "./utils/tuple"
import { ThreeErrorBoundary } from "./three-components/ThreeErrorBoundary"

const ModelLoadErrorReporter = ({
  error,
  onError,
}: {
  error: Error
  onError: (error: Error) => void
}) => {
  useEffect(() => {
    onError(error)
  }, [error, onError])

  return null
}

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
    cad_component.model_wrl_url ??
      cad_component.model_stl_url ??
      cad_component.model_obj_url,
  )
  const gltfUrl = resolveModelUrlWithStaticResolver(
    cad_component.model_glb_url ?? cad_component.model_gltf_url,
  )
  const stepUrl = resolveModelUrlWithStaticResolver(
    cad_component.model_step_url,
  )
  const [fallbackModelIndex, setFallbackModelIndex] = useState(0)
  const [lastModelError, setLastModelError] = useState<Error | null>(null)

  useEffect(() => {
    setFallbackModelIndex(0)
    setLastModelError(null)
  }, [cad_component.cad_component_id, url, gltfUrl, stepUrl])
  const pcbComponent = circuitJson.find(
    (elm) =>
      elm.type === "pcb_component" &&
      elm.source_component_id === cad_component.source_component_id,
  ) as PcbComponent | undefined
  const layer = pcbComponent?.layer ?? "top"
  const sourceModelType = getCadModelType(cad_component)
  const renderedModelType = getRenderedCadModelType(sourceModelType)
  const gltfModelType: CadModelType = cad_component.model_glb_url
    ? "glb"
    : "gltf"
  const meshModelType: CadModelType = cad_component.model_wrl_url
    ? "wrl"
    : cad_component.model_stl_url
      ? "stl"
      : "obj"

  const modelTransform = useMemo(
    () =>
      getCadModelTransform(cad_component, {
        layer,
        pcbThickness,
        modelType: renderedModelType,
      }),
    [cad_component, layer, pcbThickness, renderedModelType],
  )

  const rotationOffset = tuple(...modelTransform.rotation)
  const adjustedPosition = modelTransform.position

  const fallbackModelComponents = useMemo(() => {
    const components: React.ReactNode[] = []

    if (gltfUrl) {
      components.push(
        <GltfModel
          key={`${cad_component.cad_component_id}-gltf-${gltfUrl}`}
          gltfUrl={gltfUrl}
          position={adjustedPosition}
          rotation={rotationOffset}
          modelOffset={modelTransform.modelPosition}
          modelRotation={modelTransform.modelRotation}
          sourceCoordinateTransform={getCadLoaderTransformMatrix(
            getCadLoaderTransformConfig(cad_component, gltfModelType),
          )}
          scale={modelTransform.scale}
          modelSize={modelTransform.size}
          modelFitMode={modelTransform.fitMode}
          onHover={handleHover}
          onUnhover={handleUnhover}
          isHovered={isHovered}
          isTranslucent={cad_component.show_as_translucent_model}
        />,
      )
    }

    if (
      stepUrl &&
      !cad_component.model_jscad &&
      !cad_component.footprinter_string
    ) {
      components.push(
        <StepModel
          key={`${cad_component.cad_component_id}-step-${stepUrl}`}
          stepUrl={stepUrl}
          position={adjustedPosition}
          rotation={rotationOffset}
          modelOffset={modelTransform.modelPosition}
          modelRotation={modelTransform.modelRotation}
          sourceCoordinateTransform={getCadLoaderTransformMatrix(
            getCadLoaderTransformConfig(cad_component, renderedModelType),
          )}
          scale={modelTransform.scale}
          modelSize={modelTransform.size}
          modelFitMode={modelTransform.fitMode}
          onHover={handleHover}
          onUnhover={handleUnhover}
          isHovered={isHovered}
          isTranslucent={cad_component.show_as_translucent_model}
        />,
      )
    }

    if (url) {
      components.push(
        <MixedStlModel
          key={`${cad_component.cad_component_id}-mixed-${url}`}
          url={url}
          position={adjustedPosition}
          rotation={rotationOffset}
          modelOffset={modelTransform.modelPosition}
          modelRotation={modelTransform.modelRotation}
          sourceCoordinateTransform={getCadLoaderTransformMatrix(
            getCadLoaderTransformConfig(cad_component, meshModelType),
          )}
          scale={modelTransform.scale}
          modelSize={modelTransform.size}
          modelFitMode={modelTransform.fitMode}
          onHover={handleHover}
          onUnhover={handleUnhover}
          isHovered={isHovered}
          isTranslucent={cad_component.show_as_translucent_model}
        />,
      )
    }

    return components
  }, [
    adjustedPosition,
    cad_component.cad_component_id,
    cad_component.footprinter_string,
    cad_component.model_jscad,
    cad_component.show_as_translucent_model,
    gltfUrl,
    gltfModelType,
    handleHover,
    handleUnhover,
    isHovered,
    meshModelType,
    modelTransform.modelPosition,
    modelTransform.modelRotation,
    modelTransform.scale,
    modelTransform.fitMode,
    modelTransform.size,
    renderedModelType,
    rotationOffset,
    stepUrl,
    url,
  ])

  let modelComponent: React.ReactNode = null

  if (fallbackModelComponents.length > 0) {
    if (fallbackModelIndex >= fallbackModelComponents.length) {
      if (lastModelError) {
        throw lastModelError
      }
      return null
    }

    modelComponent = (
      <ThreeErrorBoundary
        key={`${cad_component.cad_component_id}-fallback-${fallbackModelIndex}`}
        fallback={({ error }) => (
          <ModelLoadErrorReporter
            error={error}
            onError={(nextError) => {
              setLastModelError(nextError)
              setFallbackModelIndex((current) =>
                Math.max(current, fallbackModelIndex + 1),
              )
            }}
          />
        )}
      >
        {fallbackModelComponents[fallbackModelIndex]}
      </ThreeErrorBoundary>
    )
  } else if (cad_component.model_jscad) {
    modelComponent = (
      <JscadModel
        key={cad_component.cad_component_id}
        jscadPlan={cad_component.model_jscad}
        positionOffset={adjustedPosition}
        rotationOffset={rotationOffset}
        modelOffset={modelTransform.modelPosition}
        modelRotation={modelTransform.modelRotation}
        sourceCoordinateTransform={getCadLoaderTransformMatrix(
          getCadLoaderTransformConfig(cad_component, "jscad"),
        )}
        scale={modelTransform.scale}
        modelSize={modelTransform.size}
        modelFitMode={modelTransform.fitMode}
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
        scale={modelTransform.scale}
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
