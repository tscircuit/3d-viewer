import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { useMemo, useState, useCallback, useEffect } from "react"
import { MixedStlModel } from "./three-components/MixedStlModel"
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
} from "three"
import { GltfModel } from "./three-components/GltfModel"
import { JscadModel } from "./three-components/JscadModel"
import { FootprinterModel } from "./three-components/FootprinterModel"
import { tuple } from "./utils/tuple"
import { Html } from "./react-three/Html"
import { useLayerVisibility } from "./contexts/LayerVisibilityContext"
import { GLTFExporter } from "three-stdlib"

type OcctImportParams = {
  linearUnit?: "millimeter" | "centimeter" | "meter" | "inch" | "foot"
  linearDeflectionType?: "bounding_box_ratio" | "absolute_value"
  linearDeflection?: number
  angularDeflection?: number
}

type OcctMesh = {
  name: string
  color?: [number, number, number]
  attributes: {
    position: { array: number[] }
    normal?: { array: number[] }
  }
  index: { array: number[] }
}

type OcctImportResult = {
  success: boolean
  meshes: OcctMesh[]
}

type OcctImport = {
  ReadStepFile(
    content: ArrayBufferView | ArrayBuffer,
    params: OcctImportParams | null,
  ): OcctImportResult
}

type OcctImportFactory = () => Promise<OcctImport>

let occtImportPromise: Promise<OcctImport> | undefined

function resolveOcctFactory(candidate: unknown): OcctImportFactory {
  if (typeof candidate === "function") {
    return candidate as OcctImportFactory
  }
  if (
    candidate &&
    typeof candidate === "object" &&
    "default" in candidate &&
    typeof (candidate as { default: unknown }).default === "function"
  ) {
    return (candidate as { default: unknown }).default as OcctImportFactory
  }
  throw new Error("Unable to resolve occt-import-js factory export")
}

async function loadOcctImport(): Promise<OcctImport> {
  if (!occtImportPromise) {
    const imported = await import(
      /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/+esm"
    )
    occtImportPromise = resolveOcctFactory(imported)()
  }
  return occtImportPromise
}

function occtMeshesToGroup(meshes: OcctMesh[]): Group {
  const group = new Group()
  for (const mesh of meshes) {
    const positions = mesh.attributes.position?.array ?? []
    const indices = mesh.index?.array ?? []
    if (!positions.length || !indices.length) {
      continue
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    const normals = mesh.attributes.normal?.array ?? []
    if (normals.length) {
      geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3))
    } else {
      geometry.computeVertexNormals()
    }
    geometry.setIndex(indices)
    const material = new MeshStandardMaterial({
      color: mesh.color
        ? new Color(mesh.color[0], mesh.color[1], mesh.color[2])
        : new Color(0.82, 0.82, 0.82),
    })
    const threeMesh = new Mesh(geometry, material)
    threeMesh.name = mesh.name
    group.add(threeMesh)
  }
  return group
}

async function convertStepUrlToGlbUrl(stepUrl: string): Promise<string> {
  const response = await fetch(stepUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch STEP file: ${response.statusText}`)
  }
  const buffer = await response.arrayBuffer()
  const occt = await loadOcctImport()
  const result = occt.ReadStepFile(new Uint8Array(buffer), null)
  if (!result.success || !result.meshes.length) {
    throw new Error("occt-import-js failed to convert STEP file")
  }
  const group = occtMeshesToGroup(result.meshes)
  const exporter = new GLTFExporter()
  const glb = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      group,
      (output) => {
        if (output instanceof ArrayBuffer) {
          resolve(output)
        } else {
          reject(new Error("GLTFExporter did not return binary output"))
        }
      },
      (error) => {
        reject(error)
      },
      { binary: true },
    )
  })
  return URL.createObjectURL(new Blob([glb], { type: "model/gltf-binary" }))
}

export const AnyCadComponent = ({
  cad_component,
  circuitJson,
}: {
  cad_component: CadComponent
  circuitJson: AnyCircuitElement[]
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const { visibility } = useLayerVisibility()
  const [hoverPosition, setHoverPosition] = useState<
    [number, number, number] | null
  >(null)
  const [stepGltfUrl, setStepGltfUrl] = useState<string | null>(null)

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

  const url =
    cad_component.model_obj_url ??
    cad_component.model_wrl_url ??
    cad_component.model_stl_url
  const gltfUrl = cad_component.model_glb_url ?? cad_component.model_gltf_url
  const stepUrl = cad_component.model_step_url
  const rotationOffset = cad_component.rotation
    ? tuple(
        (cad_component.rotation.x * Math.PI) / 180,
        (cad_component.rotation.y * Math.PI) / 180,
        (cad_component.rotation.z * Math.PI) / 180,
      )
    : undefined

  const shouldLoadStep =
    Boolean(stepUrl) &&
    !url &&
    !gltfUrl &&
    !cad_component.model_jscad &&
    !cad_component.footprinter_string

  useEffect(() => {
    if (!shouldLoadStep || !stepUrl) {
      setStepGltfUrl(null)
      return
    }
    let isActive = true
    let objectUrl: string | null = null
    void convertStepUrlToGlbUrl(stepUrl)
      .then((generatedUrl) => {
        if (!isActive) {
          URL.revokeObjectURL(generatedUrl)
          return
        }
        objectUrl = generatedUrl
        setStepGltfUrl(generatedUrl)
      })
      .catch((error) => {
        console.error("Failed to convert STEP file to GLB", error)
        if (isActive) {
          setStepGltfUrl(null)
        }
      })
    return () => {
      isActive = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [shouldLoadStep, stepUrl])

  let modelComponent: React.ReactNode = null

  if (url) {
    modelComponent = (
      <MixedStlModel
        key={cad_component.cad_component_id}
        url={url}
        position={
          cad_component.position
            ? [
                cad_component.position.x,
                cad_component.position.y,
                cad_component.position.z,
              ]
            : undefined
        }
        rotation={rotationOffset}
        scale={cad_component.model_unit_to_mm_scale_factor}
        onHover={handleHover}
        onUnhover={handleUnhover}
        isHovered={isHovered}
        isTranslucent={cad_component.show_as_translucent_model}
      />
    )
  } else if (gltfUrl || stepGltfUrl) {
    modelComponent = (
      <GltfModel
        key={cad_component.cad_component_id}
        gltfUrl={stepGltfUrl ?? gltfUrl ?? ""}
        position={
          cad_component.position
            ? [
                cad_component.position.x,
                cad_component.position.y,
                cad_component.position.z,
              ]
            : undefined
        }
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
        positionOffset={
          cad_component.position
            ? [
                cad_component.position.x,
                cad_component.position.y,
                cad_component.position.z,
              ]
            : undefined
        }
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
