import type { RigidExplosionView } from "./rotation-playback"
import { createContext, useContext, useEffect, useMemo } from "react"
import type { AssemblyExplosionView } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import * as THREE from "three"
import { getAssemblyGuidePoints } from "./assembly-guide-points"
import { useFrame, useThree } from "../react-three/ThreeContext"

export const AssemblyExplosionContext = createContext<{
  assembled: AnyCircuitElement[]
  view?: RigidExplosionView
  showGuidelines?: boolean
} | null>(null)

export function getAssemblyOffsets(
  assembled: AnyCircuitElement[],
  view?: AssemblyExplosionView,
) {
  if (!view) return new Map<string, THREE.Vector3>()
  const positions = new Map(
    assembled.flatMap((e) =>
      e.type === "cad_component"
        ? [[e.cad_component_id, e.position] as const]
        : [],
    ),
  )
  const offsets = new Map<string, THREE.Vector3>()
  for (const element of view?.circuitJson ?? []) {
    if (element.type !== "cad_component") continue
    const base = positions.get(element.cad_component_id)
    if (base)
      offsets.set(
        element.cad_component_id,
        new THREE.Vector3(
          element.position.x - base.x,
          element.position.y - base.y,
          element.position.z - base.z,
        ),
      )
  }
  return offsets
}

/** Identity groups use circuit-world XYZ; model loaders keep their own transforms. */
export function applyAssemblyOffsets(
  root: THREE.Object3D,
  offsets: Map<string, THREE.Vector3>,
  bases: Map<THREE.Object3D, THREE.Vector3>,
) {
  root.traverse((object) => {
    const id = object.userData.cad_component_id
    if (typeof id !== "string") return
    if (!bases.has(object)) bases.set(object, object.position.clone())
    object.position.copy(bases.get(object)!)
    const offset = offsets.get(id)
    if (offset) object.position.add(offset)
  })
  // Model loaders may replace groups after asynchronous loads or engine switches.
  for (const [object, base] of bases) {
    if (!object.parent) {
      object.position.copy(base)
      bases.delete(object)
    }
  }
  root.updateMatrixWorld(true)
}

/** Apply absolute poses, so scrubbing, reverse playback and Reset never accumulate drift. */
export function applyAssemblyTransforms(
  root: THREE.Object3D,
  transforms: Map<string, THREE.Matrix4>,
  bases: Map<THREE.Object3D, THREE.Matrix4>,
) {
  const restore = (object: THREE.Object3D, matrix: THREE.Matrix4) => {
    object.matrix.copy(matrix)
    matrix.decompose(object.position, object.quaternion, object.scale)
  }
  root.traverse((object) => {
    const id = object.userData.cad_component_id
    if (typeof id !== "string") return
    if (!bases.has(object)) {
      if (object.matrixAutoUpdate) object.updateMatrix()
      bases.set(object, object.matrix.clone())
    }
    const base = bases.get(object)!
    const pose = transforms.get(id)
    restore(object, pose ? pose.clone().multiply(base) : base)
  })
  for (const [object, base] of bases)
    if (!object.parent) {
      restore(object, base)
      bases.delete(object)
    }
  root.updateMatrixWorld(true)
}

export function AssemblyExplosionScene() {
  const state = useContext(AssemblyExplosionContext)
  const { rootObject } = useThree()
  const bases = useMemo(
    () => new Map<THREE.Object3D, THREE.Matrix4>(),
    [rootObject],
  )
  const offsets = useMemo(
    () => getAssemblyOffsets(state?.assembled ?? [], state?.view),
    [state?.assembled, state?.view],
  )
  const transforms = useMemo(
    () =>
      state?.view?.assemblyTransforms ??
      new Map(
        [...offsets].map(([id, offset]) => [
          id,
          new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z),
        ]),
      ),
    [state?.view, offsets],
  )
  const guides = useMemo(() => {
    const lines = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({
        color: 0x6688aa,
        dashSize: 1,
        gapSize: 0.5,
      }),
    )
    lines.userData.assemblyExplosionGuides = true
    return lines
  }, [rootObject])
  useEffect(() => {
    rootObject.add(guides)
    return () => {
      rootObject.remove(guides)
      guides.geometry.dispose()
      guides.material.dispose()
    }
  }, [rootObject, guides])
  useFrame(() => {
    if (state?.view || bases.size) {
      applyAssemblyTransforms(rootObject, transforms, bases)
      if (!state?.view) bases.clear()
    }
    const points =
      state?.view && state.showGuidelines !== false
        ? getAssemblyGuidePoints(rootObject, state.view)
        : []
    guides.visible = points.length > 0
    if (!points.length) return
    let positions = guides.geometry.getAttribute("position") as
      | THREE.BufferAttribute
      | undefined
    if (!positions || positions.count < points.length) {
      guides.geometry.dispose()
      guides.geometry = new THREE.BufferGeometry()
      positions = new THREE.Float32BufferAttribute(
        new Float32Array(points.length * 3),
        3,
      )
      guides.geometry.setAttribute("position", positions)
      guides.geometry.setAttribute(
        "lineDistance",
        new THREE.Float32BufferAttribute(new Float32Array(points.length), 1),
      )
    }
    const distances = guides.geometry.getAttribute(
      "lineDistance",
    ) as THREE.BufferAttribute
    let distance = 0
    for (let i = 0; i < points.length; i++) {
      const point = points[i]!
      positions.setXYZ(i, point.x, point.y, point.z)
      if (i % 2) distance += point.distanceTo(points[i - 1]!)
      distances.setX(i, distance)
    }
    positions.needsUpdate = true
    distances.needsUpdate = true
    guides.geometry.setDrawRange(0, points.length)
    guides.geometry.computeBoundingSphere()
  }, [
    rootObject,
    state?.view,
    state?.showGuidelines,
    transforms,
    bases,
    guides,
  ])
  useEffect(
    () => () => {
      for (const [object, base] of bases) {
        object.matrix.copy(base)
        base.decompose(object.position, object.quaternion, object.scale)
      }
      bases.clear()
    },
    [bases],
  )
  return null
}
