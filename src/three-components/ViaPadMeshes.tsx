import type { AnyCircuitElement, PcbVia } from "circuit-json"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import { colors } from "../geoms/constants"
import { useThree } from "../react-three/ThreeContext"

const VIA_PAD_SURFACE_OFFSET = 0.008

const vertexShader = /* glsl */ `
  attribute float innerRatio;
  varying vec2 vViaCoord;
  varying float vInnerRatio;

  void main() {
    vViaCoord = position.xy;
    vInnerRatio = innerRatio;
    vec4 instancePosition = instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * instancePosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 copperColor;
  varying vec2 vViaCoord;
  varying float vInnerRatio;

  void main() {
    float radius = length(vViaCoord);
    float antialiasWidth = fwidth(radius);
    float outerEdge = 1.0 - smoothstep(
      1.0 - antialiasWidth,
      1.0 + antialiasWidth,
      radius
    );
    float innerEdge = smoothstep(
      vInnerRatio - antialiasWidth,
      vInnerRatio + antialiasWidth,
      radius
    );
    float alpha = outerEdge * innerEdge;
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(copperColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const createViaPadMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      copperColor: {
        value: new THREE.Color(
          colors.copper[0],
          colors.copper[1],
          colors.copper[2],
        ),
      },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    toneMapped: true,
  })

export const createViaPadMesh = ({
  vias,
  layer,
  pcbThickness,
  material,
}: {
  vias: PcbVia[]
  layer: "top" | "bottom"
  pcbThickness: number
  material?: THREE.ShaderMaterial
}): THREE.InstancedMesh | null => {
  const layerVias = vias.filter(
    (via) => !Array.isArray(via.layers) || via.layers.includes(layer),
  )
  if (layerVias.length === 0) return null

  // A single unit quad is reused for every via. The fragment shader draws an
  // analytic ring, so zooming never magnifies a board-wide raster texture.
  const geometry = new THREE.PlaneGeometry(2, 2)
  const innerRatios = new Float32Array(layerVias.length)
  geometry.setAttribute(
    "innerRatio",
    new THREE.InstancedBufferAttribute(innerRatios, 1),
  )

  const mesh = new THREE.InstancedMesh(
    geometry,
    material ?? createViaPadMaterial(),
    layerVias.length,
  )
  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  const zDirection = layer === "top" ? 1 : -1
  const z = zDirection * (pcbThickness / 2 + VIA_PAD_SURFACE_OFFSET)

  layerVias.forEach((via, index) => {
    const outerRadius = via.outer_diameter / 2
    innerRatios[index] = via.hole_diameter / via.outer_diameter
    position.set(via.x, via.y, z)
    scale.set(outerRadius, outerRadius, 1)
    matrix.compose(position, quaternion, scale)
    mesh.setMatrixAt(index, matrix)
  })

  geometry.getAttribute("innerRatio").needsUpdate = true
  mesh.instanceMatrix.needsUpdate = true
  mesh.computeBoundingSphere()
  mesh.name = `${layer}-via-pad-preview`
  mesh.userData.previewOnly = true
  mesh.frustumCulled = false
  mesh.renderOrder = 2
  return mesh
}

export const ViaPadMeshes = ({
  circuitJson,
  pcbThickness,
}: {
  circuitJson: AnyCircuitElement[]
  pcbThickness: number
}) => {
  const { rootObject } = useThree()
  const { visibility } = useLayerVisibility()
  const vias = useMemo(
    () =>
      circuitJson.filter(
        (element): element is PcbVia => element.type === "pcb_via",
      ),
    [circuitJson],
  )
  const meshes = useMemo(() => {
    const material = createViaPadMaterial()
    const top = createViaPadMesh({
      vias,
      layer: "top",
      pcbThickness,
      material,
    })
    const bottom = createViaPadMesh({
      vias,
      layer: "bottom",
      pcbThickness,
      material,
    })
    return { material, top, bottom }
  }, [vias, pcbThickness])

  useEffect(() => {
    meshes.top && rootObject.add(meshes.top)
    meshes.bottom && rootObject.add(meshes.bottom)

    return () => {
      if (meshes.top) {
        rootObject.remove(meshes.top)
        meshes.top.geometry.dispose()
      }
      if (meshes.bottom) {
        rootObject.remove(meshes.bottom)
        meshes.bottom.geometry.dispose()
      }
      meshes.material.dispose()
    }
  }, [rootObject, meshes])

  useEffect(() => {
    if (meshes.top) meshes.top.visible = visibility.topCopper
    if (meshes.bottom) meshes.bottom.visible = visibility.bottomCopper
  }, [meshes, visibility.topCopper, visibility.bottomCopper])

  return null
}
