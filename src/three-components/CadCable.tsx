import { parseCableString } from "@tscircuit/cableprinter"
import { createCableMeshes, type CablePoint } from "jscad-electronics/cables"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { useThree } from "../react-three/ThreeContext"
import { configureObjectShadows } from "../utils/configure-object-shadows"

interface Point3d {
  x: number
  y: number
  z: number
}

export interface CadCableElement {
  type: "cad_cable"
  cad_cable_id: string
  name?: string
  cableprinter_string: string
  path: Point3d[]
  from_connector_pin1_position?: Point3d
  to_connector_pin1_position?: Point3d
}

export const isCadCableElement = (
  element: unknown,
): element is CadCableElement => {
  if (!element || typeof element !== "object") return false
  const candidate = element as Partial<CadCableElement>
  return (
    candidate.type === "cad_cable" &&
    typeof candidate.cad_cable_id === "string" &&
    typeof candidate.cableprinter_string === "string" &&
    Array.isArray(candidate.path)
  )
}

export const getCadCables = (elements: readonly unknown[]) =>
  elements.filter(isCadCableElement)

const toCablePoint = ({ x, y, z }: Point3d): CablePoint => [x, y, z]

const getConnectorPin1Side = (
  path: Point3d[],
  pin1Position: Point3d | undefined,
  end: "start" | "end",
): CablePoint | undefined => {
  if (!pin1Position || path.length < 2) return undefined

  const endpoint = end === "start" ? path[0] : path[path.length - 1]
  const adjacent = end === "start" ? path[1] : path[path.length - 2]
  if (!endpoint || !adjacent) return undefined
  const cableAxis = new THREE.Vector3(
    adjacent.x - endpoint.x,
    adjacent.y - endpoint.y,
    adjacent.z - endpoint.z,
  )
  if (cableAxis.lengthSq() < 1e-12) return undefined
  cableAxis.normalize()

  const pin1Side = new THREE.Vector3(
    pin1Position.x - endpoint.x,
    pin1Position.y - endpoint.y,
    pin1Position.z - endpoint.z,
  )
  pin1Side.addScaledVector(cableAxis, -pin1Side.dot(cableAxis))
  if (pin1Side.lengthSq() < 1e-12) return undefined
  pin1Side.normalize()

  return [pin1Side.x, pin1Side.y, pin1Side.z]
}

export const createCadCableObject = (cable: CadCableElement) => {
  const definition = parseCableString(cable.cableprinter_string)
  const cableMeshes = createCableMeshes({
    definition,
    path: cable.path.map(toCablePoint),
    startPin1Side: getConnectorPin1Side(
      cable.path,
      cable.from_connector_pin1_position,
      "start",
    ),
    endPin1Side: getConnectorPin1Side(
      cable.path,
      cable.to_connector_pin1_position,
      "end",
    ),
  })

  const group = new THREE.Group()
  group.name = `cad-cable-${cable.cad_cable_id}`
  group.userData = { cadCableId: cable.cad_cable_id, name: cable.name }

  for (const cableMesh of cableMeshes) {
    let geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(cableMesh.positions, 3),
    )
    geometry.setIndex(cableMesh.indices)
    if (!cableMesh.smooth) geometry = geometry.toNonIndexed()
    geometry.computeVertexNormals()

    const [red, green, blue, alpha] = cableMesh.color
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(red, green, blue),
      metalness: cableMesh.material?.metalness ?? 0,
      roughness: cableMesh.material?.roughness ?? 0.7,
      opacity: alpha,
      transparent: alpha < 1,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `${group.name}:${cableMesh.name}`
    configureObjectShadows(mesh, { castShadow: true, receiveShadow: true })
    group.add(mesh)
  }

  return group
}

const disposeCadCableObject = (group: THREE.Group) => {
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material]
    for (const material of materials) material.dispose()
  })
}

export const CadCable = ({ cable }: { cable: CadCableElement }) => {
  const { rootObject } = useThree()
  const cableObject = useMemo(() => {
    try {
      return createCadCableObject(cable)
    } catch (error) {
      console.error(`Failed to render CAD cable ${cable.cad_cable_id}`, error)
      return null
    }
  }, [cable])

  useEffect(() => {
    if (!cableObject) return
    rootObject.add(cableObject)
    return () => {
      rootObject.remove(cableObject)
      disposeCadCableObject(cableObject)
    }
  }, [cableObject, rootObject])

  return null
}
