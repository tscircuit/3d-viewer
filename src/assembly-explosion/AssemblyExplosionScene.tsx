import { createContext, useContext, useEffect, useMemo } from "react"
import type { AssemblyExplosionView } from "@tscircuit/core"
import type { AnyCircuitElement } from "circuit-json"
import * as THREE from "three"
import { useFrame, useThree } from "../react-three/ThreeContext"

export const AssemblyExplosionContext = createContext<{
  assembled: AnyCircuitElement[]
  view?: AssemblyExplosionView
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

export function AssemblyExplosionScene() {
  const state = useContext(AssemblyExplosionContext)
  const { rootObject } = useThree()
  const bases = useMemo(
    () => new Map<THREE.Object3D, THREE.Vector3>(),
    [rootObject],
  )
  const offsets = useMemo(
    () => getAssemblyOffsets(state?.assembled ?? [], state?.view),
    [state?.assembled, state?.view],
  )
  useFrame(() => {
    if (state?.view || bases.size) {
      applyAssemblyOffsets(rootObject, offsets, bases)
      if (!state?.view) bases.clear()
    }
  }, [rootObject, state?.view, offsets, bases])
  useEffect(
    () => () => {
      for (const [object, base] of bases) object.position.copy(base)
      bases.clear()
    },
    [bases],
  )
  useEffect(() => {
    if (!state?.view?.lines.length) return
    const points = state.view.lines
      .flatMap((line) =>
        line.points.slice(1).flatMap((point, i) => [line.points[i]!, point]),
      )
      .map((p) => new THREE.Vector3(p.x, p.y, p.z))
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineDashedMaterial({
      color: 0x6688aa,
      dashSize: 1,
      gapSize: 0.5,
    })
    const guides = new THREE.LineSegments(geometry, material)
    guides.computeLineDistances()
    rootObject.add(guides)
    return () => {
      rootObject.remove(guides)
      geometry.dispose()
      material.dispose()
    }
  }, [rootObject, state?.view])
  return null
}
