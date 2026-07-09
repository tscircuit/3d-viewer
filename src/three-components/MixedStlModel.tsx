import ContainerWithTooltip from "src/ContainerWithTooltip"
import { useGlobalObjLoader } from "src/hooks/use-global-obj-loader"
import type { Euler, Vector3 } from "three"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import type { CadModelFitMode, CadModelSize } from "src/utils/cad-model-fit"
import { configureObjectShadows } from "src/utils/configure-object-shadows"
import { getDefaultEnvironmentMap } from "src/react-three/getDefaultEnvironmentMap"
import { useRenderingMode } from "src/contexts/RenderingModeContext"
import { useThree } from "src/react-three/ThreeContext"
import {
  applyComponentMaterialTextureProfile,
  normalizeComponentMaterial,
  restoreComponentMaterialTextureProfile,
  type ComponentMaterialProfileSnapshot,
} from "src/utils/component-material-textures"
import { useCadModelTransformGraph } from "./useCadModelTransformGraph"

const DEFAULT_ENV_MAP_INTENSITY = 1.25

export function MixedStlModel({
  url,
  position,
  rotation,
  modelOffset = [0, 0, 0],
  modelRotation = [0, 0, 0],
  sourceCoordinateTransform,
  modelSize,
  modelFitMode = "contain_within_bounds",
  onHover,
  onUnhover,
  isHovered,
  scale,
  isTranslucent = false,
}: {
  url: string
  position?: Vector3 | [number, number, number]
  rotation?: Euler | [number, number, number]
  modelOffset?: [number, number, number]
  modelRotation?: [number, number, number]
  sourceCoordinateTransform?: THREE.Matrix4
  modelSize?: CadModelSize
  modelFitMode?: CadModelFitMode
  onHover: (e: any) => void
  onUnhover: () => void
  isHovered: boolean
  scale?: number
  isTranslucent?: boolean
}) {
  const { renderer } = useThree()
  const { renderingMode } = useRenderingMode()
  const obj = useGlobalObjLoader(url)
  const model = useMemo(() => {
    if (obj && !(obj instanceof Error)) {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const prepareMaterial = (mat: THREE.Material) => {
            const normalizedMaterial = normalizeComponentMaterial(mat.clone())
            normalizedMaterial.transparent = isTranslucent
            normalizedMaterial.opacity = isTranslucent ? 0.5 : 1
            normalizedMaterial.depthWrite = !isTranslucent
            normalizedMaterial.needsUpdate = true
            return normalizedMaterial
          }

          if (Array.isArray(child.material)) {
            child.material = child.material.map(prepareMaterial)
          } else {
            child.material = prepareMaterial(child.material)
          }

          child.renderOrder = isTranslucent ? 2 : 1
        }
      })
      configureObjectShadows(obj, {
        castShadow: !isTranslucent,
        receiveShadow: true,
      })
      return obj
    }
    // Fallback mesh
    const fallbackMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({
        transparent: true,
        color: "red",
        opacity: 0.25,
      }),
    )
    configureObjectShadows(fallbackMesh, {
      castShadow: false,
      receiveShadow: true,
    })
    return fallbackMesh
  }, [obj, isTranslucent])

  useEffect(() => {
    if (!model || !renderer) return

    const environmentMap = getDefaultEnvironmentMap(renderer)
    if (!environmentMap) return

    const previousMaterialState: ComponentMaterialProfileSnapshot[] = []

    const applyProfileToMaterial = (
      material: THREE.Material,
      meshName: string,
    ) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return

      previousMaterialState.push(
        applyComponentMaterialTextureProfile({
          material,
          meshName,
          renderingMode,
          environmentMap,
          defaultEnvMapIntensity: DEFAULT_ENV_MAP_INTENSITY,
          realisticEnvMapIntensity: 1.8,
        }),
      )
    }

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      const material = child.material
      if (Array.isArray(material)) {
        material.forEach((mat) => applyProfileToMaterial(mat, child.name))
      } else if (material) {
        applyProfileToMaterial(material, child.name)
      }
    })

    return () => {
      previousMaterialState.forEach(restoreComponentMaterialTextureProfile)
    }
  }, [model, renderer, renderingMode])

  const { boardTransformGroup } = useCadModelTransformGraph({
    model,
    position: Array.isArray(position)
      ? position
      : position
        ? [position.x, position.y, position.z]
        : undefined,
    rotation: Array.isArray(rotation)
      ? rotation
      : rotation
        ? [rotation.x, rotation.y, rotation.z]
        : undefined,
    modelOffset,
    modelRotation,
    sourceCoordinateTransform,
    modelSize,
    modelFitMode,
    scale,
  })

  if (obj instanceof Error) {
    throw obj
  }

  return (
    <ContainerWithTooltip
      isHovered={isHovered}
      onHover={onHover}
      onUnhover={onUnhover}
      object={boardTransformGroup}
    >
      {/* This component now just manages hover state, the 3D object is added imperatively */}
    </ContainerWithTooltip>
  )
}
