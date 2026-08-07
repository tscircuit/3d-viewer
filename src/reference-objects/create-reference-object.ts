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
  return createPrismGeometryFromShape(
    createRoundedRectangleShape(width, height, radius),
    depth,
  )
}

const createPrismGeometryFromShape = (shape: THREE.Shape, depth: number) => {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 24,
  })
  geometry.translate(0, 0, -depth / 2)
  geometry.computeVertexNormals()
  return geometry
}

const normalizeObjectToSpec = (
  object: THREE.Object3D,
  type: ReferenceObjectType,
) => {
  const spec = REFERENCE_OBJECT_SPECS[type]
  object.updateMatrixWorld(true)
  const initialBounds = new THREE.Box3().setFromObject(object)
  const initialSize = initialBounds.getSize(new THREE.Vector3())
  object.scale.set(
    spec.width / initialSize.x,
    spec.height / initialSize.y,
    spec.depth / initialSize.z,
  )
  object.updateMatrixWorld(true)

  const scaledBounds = new THREE.Box3().setFromObject(object)
  const scaledCenter = scaledBounds.getCenter(new THREE.Vector3())
  object.position.set(
    -scaledCenter.x,
    -scaledCenter.y,
    spec.zCenter - scaledCenter.z,
  )
  object.updateMatrixWorld(true)
}

const createBananaGeometry = () => {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-82, 18, 16),
    new THREE.Vector3(-67, 7, 15),
    new THREE.Vector3(-43, -9, 14),
    new THREE.Vector3(-15, -18, 14),
    new THREE.Vector3(16, -18, 14),
    new THREE.Vector3(47, -8, 14.5),
    new THREE.Vector3(72, 8, 16),
    new THREE.Vector3(84, 19, 17),
  ])
  const tubularSegments = 84
  const radialSegments = 30
  const frames = curve.computeFrenetFrames(tubularSegments, false)
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const ripeYellow = new THREE.Color(0xffd447)
  const stemGreen = new THREE.Color(0xb7b335)

  for (let segment = 0; segment <= tubularSegments; segment++) {
    const t = segment / tubularSegments
    const point = curve.getPointAt(t)
    const normal = frames.normals[segment]!
    const binormal = frames.binormals[segment]!
    const taper = Math.sin(Math.PI * t) ** 0.48
    const radius = 3.4 + 12.4 * taper
    const stemBlend = Math.max(0, (t - 0.82) / 0.18) * 0.38
    const ringColor = ripeYellow.clone().lerp(stemGreen, stemBlend)

    for (let side = 0; side <= radialSegments; side++) {
      const angle = (side / radialSegments) * Math.PI * 2
      const sin = Math.sin(angle)
      const cos = Math.cos(angle)
      const ridgeScale = 1 + Math.cos(angle * 5 + 0.35) * 0.035
      const radialNormal = new THREE.Vector3()
        .addScaledVector(normal, cos)
        .addScaledVector(binormal, sin * 0.9)
        .normalize()
      const vertex = point
        .clone()
        .addScaledVector(normal, cos * radius * ridgeScale)
        .addScaledVector(binormal, sin * radius * 0.9 * ridgeScale)

      positions.push(vertex.x, vertex.y, vertex.z)
      normals.push(radialNormal.x, radialNormal.y, radialNormal.z)
      colors.push(ringColor.r, ringColor.g, ringColor.b)
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
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return { geometry, curve }
}

const createBanana = () => {
  const group = new THREE.Group()
  const banana = new THREE.Group()
  const { geometry, curve } = createBananaGeometry()
  const peel = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0,
      vertexColors: true,
    }),
  )
  peel.name = "banana-peel"
  banana.add(peel)

  const blossomTip = new THREE.Mesh(
    new THREE.SphereGeometry(3.4, 20, 12),
    new THREE.MeshStandardMaterial({
      color: 0x5f421c,
      roughness: 0.92,
    }),
  )
  blossomTip.position.copy(curve.getPointAt(0))
  blossomTip.scale.set(1.15, 0.78, 0.78)
  blossomTip.name = "banana-blossom-tip"
  banana.add(blossomTip)

  const stemLength = 11
  const stemTangent = curve.getTangentAt(1).normalize()
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 4.1, stemLength, 18),
    new THREE.MeshStandardMaterial({
      color: 0x817329,
      roughness: 0.82,
    }),
  )
  stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), stemTangent)
  stem.position
    .copy(curve.getPointAt(1))
    .addScaledVector(stemTangent, stemLength / 2)
  stem.name = "banana-stem"
  banana.add(stem)

  const stemTip = new THREE.Mesh(
    new THREE.SphereGeometry(2.55, 18, 10),
    new THREE.MeshStandardMaterial({
      color: 0x5b451e,
      roughness: 0.9,
    }),
  )
  stemTip.position
    .copy(curve.getPointAt(1))
    .addScaledVector(stemTangent, stemLength)
  stemTip.name = "banana-stem-tip"
  banana.add(stemTip)

  normalizeObjectToSpec(banana, "banana")
  group.add(banana)

  return group
}

const createMacbookLidGeometry = (
  width: number,
  height: number,
  depth: number,
  radius: number,
  indentRadius: number,
) => {
  const lidShape = createRoundedRectangleShape(width, height, radius)
  const indent = new THREE.Path()
  indent.absarc(0, 0, indentRadius, 0, Math.PI * 2, true)
  lidShape.holes.push(indent)
  return createPrismGeometryFromShape(lidShape, depth)
}

const createMacbookIndent = (topZ: number, radius: number) => {
  const indentDepth = 0.35
  const diskDepth = 0.25
  const disk = new THREE.Mesh(
    new THREE.CylinderGeometry(radius - 0.15, radius - 0.15, diskDepth, 48),
    new THREE.MeshStandardMaterial({
      color: 0x9ba0a2,
      roughness: 0.48,
      metalness: 0.28,
    }),
  )
  disk.rotation.x = Math.PI / 2
  disk.position.z = topZ - indentDepth - diskDepth / 2
  disk.name = "macbook-lid-indent"
  return disk
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

  const lidDepth = 2
  const lidCenterZ = 6.75
  const lidTopZ = lidCenterZ + lidDepth / 2
  const indentRadius = 12
  const lid = new THREE.Mesh(
    createMacbookLidGeometry(
      spec.width - 1.8,
      spec.height - 1.8,
      lidDepth,
      8.2,
      indentRadius,
    ),
    aluminumMaterial.clone(),
  )
  lid.position.z = lidCenterZ
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

  group.add(createMacbookIndent(lidTopZ, indentRadius))

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
