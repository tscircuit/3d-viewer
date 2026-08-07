import * as THREE from "three"
import { configureObjectShadows } from "../utils/configure-object-shadows"
import {
  REFERENCE_OBJECT_SPECS,
  type ReferenceObjectType,
} from "./reference-object"

const createRoundedRectangleShape = (
  width: number,
  height: number,
  radius: number,
) => {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const safeRadius = Math.min(radius, halfWidth, halfHeight)
  const shape = new THREE.Shape()

  shape.moveTo(-halfWidth + safeRadius, -halfHeight)
  shape.lineTo(halfWidth - safeRadius, -halfHeight)
  shape.quadraticCurveTo(
    halfWidth,
    -halfHeight,
    halfWidth,
    -halfHeight + safeRadius,
  )
  shape.lineTo(halfWidth, halfHeight - safeRadius)
  shape.quadraticCurveTo(
    halfWidth,
    halfHeight,
    halfWidth - safeRadius,
    halfHeight,
  )
  shape.lineTo(-halfWidth + safeRadius, halfHeight)
  shape.quadraticCurveTo(
    -halfWidth,
    halfHeight,
    -halfWidth,
    halfHeight - safeRadius,
  )
  shape.lineTo(-halfWidth, -halfHeight + safeRadius)
  shape.quadraticCurveTo(
    -halfWidth,
    -halfHeight,
    -halfWidth + safeRadius,
    -halfHeight,
  )

  return shape
}

const createRoundedPrismGeometry = (
  width: number,
  height: number,
  depth: number,
  radius: number,
) => {
  const geometry = new THREE.ExtrudeGeometry(
    createRoundedRectangleShape(width, height, radius),
    {
      depth,
      bevelEnabled: false,
      curveSegments: 24,
    },
  )
  geometry.translate(0, 0, -depth / 2)
  geometry.computeVertexNormals()
  return geometry
}

const createBananaGeometry = () => {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-88, 9, 12),
    new THREE.Vector3(-60, -1, 12),
    new THREE.Vector3(-30, -7, 12),
    new THREE.Vector3(0, -9, 12),
    new THREE.Vector3(30, -7, 12),
    new THREE.Vector3(60, -1, 12),
    new THREE.Vector3(88, 9, 12),
  ])
  const tubularSegments = 72
  const radialSegments = 24
  const frames = curve.computeFrenetFrames(tubularSegments, false)
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let segment = 0; segment <= tubularSegments; segment++) {
    const t = segment / tubularSegments
    const point = curve.getPointAt(t)
    const normal = frames.normals[segment]!
    const binormal = frames.binormals[segment]!
    const taper = Math.sin(Math.PI * t) ** 0.55
    const radius = 3.2 + 8.5 * taper

    for (let side = 0; side <= radialSegments; side++) {
      const angle = (side / radialSegments) * Math.PI * 2
      const sin = Math.sin(angle)
      const cos = Math.cos(angle)
      const radialNormal = new THREE.Vector3()
        .addScaledVector(normal, cos)
        .addScaledVector(binormal, sin)
        .normalize()
      const vertex = point.clone().addScaledVector(radialNormal, radius)

      positions.push(vertex.x, vertex.y, vertex.z)
      normals.push(radialNormal.x, radialNormal.y, radialNormal.z)
      uvs.push(t, side / radialSegments)
    }
  }

  for (let segment = 1; segment <= tubularSegments; segment++) {
    for (let side = 1; side <= radialSegments; side++) {
      const rowSize = radialSegments + 1
      const a = rowSize * (segment - 1) + (side - 1)
      const b = rowSize * segment + (side - 1)
      const c = rowSize * segment + side
      const d = rowSize * (segment - 1) + side
      indices.push(a, b, d, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setIndex(indices)
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return { geometry, curve }
}

const createBanana = () => {
  const group = new THREE.Group()
  const { geometry, curve } = createBananaGeometry()
  const peel = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: 0xf4ce2f,
      roughness: 0.76,
      metalness: 0,
    }),
  )
  peel.name = "banana-peel"
  group.add(peel)

  const tipMaterial = new THREE.MeshStandardMaterial({
    color: 0x70501e,
    roughness: 0.9,
  })
  for (const t of [0, 1]) {
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(3.7, 20, 12),
      tipMaterial,
    )
    tip.position.copy(curve.getPointAt(t))
    tip.scale.set(1.25, 0.8, 0.8)
    tip.name = "banana-tip"
    group.add(tip)
  }

  return group
}

const createCreditCard = () => {
  const spec = REFERENCE_OBJECT_SPECS["credit-card"]
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    createRoundedPrismGeometry(spec.width, spec.height, spec.depth, 3.18),
    new THREE.MeshStandardMaterial({
      color: 0x245da8,
      roughness: 0.38,
      metalness: 0.08,
    }),
  )
  body.name = "credit-card-body"
  group.add(body)

  const surfaceZ = spec.depth / 2 + 0.08
  const chip = new THREE.Mesh(
    createRoundedPrismGeometry(12, 9, 0.14, 1.2),
    new THREE.MeshStandardMaterial({
      color: 0xd5ad45,
      roughness: 0.3,
      metalness: 0.62,
    }),
  )
  chip.position.set(-21, 3, surfaceZ)
  chip.name = "credit-card-chip"
  group.add(chip)

  const stripeMaterial = new THREE.MeshStandardMaterial({
    color: 0xe9eef5,
    roughness: 0.45,
    metalness: 0.05,
  })
  for (let index = 0; index < 4; index++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(index === 3 ? 8 : 12, 0.8, 0.1),
      stripeMaterial,
    )
    stripe.position.set(-20 + index * 14, -14, surfaceZ + 0.08)
    stripe.name = "credit-card-detail"
    group.add(stripe)
  }

  return group
}

const createMacbook = () => {
  const spec = REFERENCE_OBJECT_SPECS["14in-macbook"]
  const group = new THREE.Group()
  const aluminumMaterial = new THREE.MeshStandardMaterial({
    color: 0xc4c7c9,
    roughness: 0.3,
    metalness: 0.38,
  })
  const body = new THREE.Mesh(
    createRoundedPrismGeometry(spec.width, spec.height, 13.5, 9),
    aluminumMaterial,
  )
  body.position.z = -1
  body.name = "macbook-body"
  group.add(body)

  const lid = new THREE.Mesh(
    createRoundedPrismGeometry(spec.width - 1.8, spec.height - 1.8, 2, 8.2),
    aluminumMaterial.clone(),
  )
  lid.position.z = 6.75
  lid.name = "macbook-lid"
  group.add(lid)

  const hinge = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width - 42, 3.2, 1.2),
    new THREE.MeshStandardMaterial({
      color: 0x303336,
      roughness: 0.55,
      metalness: 0.45,
    }),
  )
  hinge.position.set(0, spec.height / 2 - 2.4, 6.15)
  hinge.name = "macbook-hinge"
  group.add(hinge)

  const lidMark = new THREE.Mesh(
    new THREE.CircleGeometry(13, 40),
    new THREE.MeshStandardMaterial({
      color: 0x92979b,
      roughness: 0.34,
      metalness: 0.82,
      side: THREE.DoubleSide,
    }),
  )
  lidMark.position.z = 7.77
  lidMark.name = "macbook-lid-mark"
  group.add(lidMark)

  const frontNotch = new THREE.Mesh(
    new THREE.BoxGeometry(54, 1.2, 0.8),
    new THREE.MeshStandardMaterial({
      color: 0x666b6e,
      roughness: 0.45,
      metalness: 0.5,
    }),
  )
  frontNotch.position.set(0, -spec.height / 2 + 0.5, 2.5)
  frontNotch.name = "macbook-front-notch"
  group.add(frontNotch)

  return group
}

export const createReferenceObject = (type: ReferenceObjectType) => {
  const group =
    type === "banana"
      ? createBanana()
      : type === "credit-card"
        ? createCreditCard()
        : createMacbook()

  group.name = `reference-object-${type}`
  group.userData.isReferenceObject = true
  group.userData.referenceObjectType = type
  configureObjectShadows(group)
  return group
}

export const disposeReferenceObject = (object: THREE.Object3D) => {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    geometries.add(child.geometry)
    const childMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material]
    for (const material of childMaterials) materials.add(material)
  })
  for (const geometry of geometries) geometry.dispose()
  for (const material of materials) material.dispose()
}
