import type { CadComponent } from "circuit-json"
import {
  convertCSGToThreeGeom,
  getJscadModelForFootprint,
} from "jscad-electronics/vanilla"
import * as THREE from "three"
import * as jscadModeling from "@jscad/modeling"
import { resolveJscadGeometries } from "../three-components/JscadModel"
import { load3DModel } from "./load-model"

export async function renderComponent(
  component: CadComponent,
  scene: THREE.Scene,
) {
  // Handle STL/OBJ models first
  const url =
    component.model_obj_url ??
    component.model_wrl_url ??
    component.model_stl_url ??
    component.model_glb_url ??
    component.model_gltf_url
  if (url) {
    const model = await load3DModel(url)
    if (model) {
      if (component.position) {
        model.position.set(
          component.position.x ?? 0,
          component.position.y ?? 0,
          (component.position.z ?? 0) + 0.5,
        )
      }
      if (component.rotation) {
        model.rotation.set(
          THREE.MathUtils.degToRad(component.rotation.x ?? 0),
          THREE.MathUtils.degToRad(component.rotation.y ?? 0),
          THREE.MathUtils.degToRad(component.rotation.z ?? 0),
        )
      }
      scene.add(model)
      return
    }
  }

  // Handle JSCAD models
  if (component.model_jscad) {
    const entries = resolveJscadGeometries(component.model_jscad as any)
    for (const entry of entries) {
      let geomToConvert = entry.geom
      const hasVertexColor =
        entry.color !== undefined || Array.isArray(entry.geom.color)
      if (entry.color !== undefined && !Array.isArray(entry.geom.color)) {
        if (Array.isArray(entry.color)) {
          geomToConvert = {
            ...entry.geom,
            color: entry.color.slice(0, 3),
          }
        } else {
          const threeColor = new THREE.Color(entry.color)
          threeColor.convertLinearToSRGB()
          geomToConvert = {
            ...entry.geom,
            color: [threeColor.r, threeColor.g, threeColor.b],
          }
        }
      }

      const threeGeom = convertCSGToThreeGeom(geomToConvert)
      const material = new THREE.MeshStandardMaterial(
        hasVertexColor
          ? {
              vertexColors: true,
              metalness: 0.2,
              roughness: 0.8,
              side: THREE.DoubleSide,
            }
          : {
              color: 0x888888,
              metalness: 0.5,
              roughness: 0.5,
              side: THREE.DoubleSide,
            },
      )
      const mesh = new THREE.Mesh(threeGeom, material)

      if (component.position) {
        mesh.position.set(
          component.position.x ?? 0,
          component.position.y ?? 0,
          (component.position.z ?? 0) + 0.5,
        )
      }
      if (component.rotation) {
        mesh.rotation.set(
          THREE.MathUtils.degToRad(component.rotation.x ?? 0),
          THREE.MathUtils.degToRad(component.rotation.y ?? 0),
          THREE.MathUtils.degToRad(component.rotation.z ?? 0),
        )
      }
      scene.add(mesh)
    }
    return
  }

  // Handle footprints
  if (component.footprinter_string) {
    const normalizedFootprint = component.footprinter_string.replace(
      /^pin-header(?=_|\d|\b)/i,
      "pinheader",
    )
    let modelResult: { geometries?: any[] } | null = null
    try {
      modelResult = getJscadModelForFootprint(
        normalizedFootprint,
        jscadModeling,
      )
    } catch {
      modelResult = null
    }
    const geometries = modelResult?.geometries ?? []

    // Process each operation from the footprinter
    for (const geomInfo of geometries.flat(Infinity) as any[]) {
      if (!geomInfo) continue
      const geom = geomInfo.geom ?? geomInfo
      if (!geom || (!geom.polygons && !geom.sides)) {
        continue
      }

      const color = new THREE.Color(geomInfo.color ?? [0.6, 0.6, 0.6])
      color.convertLinearToSRGB()
      const geomWithColor = { ...geom, color: [color.r, color.g, color.b] }

      const threeGeom = convertCSGToThreeGeom(geomWithColor)
      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.2,
        roughness: 0.8,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(threeGeom, material)

      if (component.position) {
        mesh.position.set(
          component.position.x ?? 0,
          component.position.y ?? 0,
          (component.position.z ?? 0) + 0.5,
        )
      }
      if (component.rotation) {
        mesh.rotation.set(
          THREE.MathUtils.degToRad(component.rotation.x ?? 0),
          THREE.MathUtils.degToRad(component.rotation.y ?? 0),
          THREE.MathUtils.degToRad(component.rotation.z ?? 0),
        )
      }
      scene.add(mesh)
    }
    return
  }

  // Add fallback box for failed components
  const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
  const material = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.25,
  })
  const mesh = new THREE.Mesh(geometry, material)

  if (component.position) {
    mesh.position.set(
      component.position.x ?? 0,
      component.position.y ?? 0,
      (component.position.z ?? 0) + 0.5,
    )
  }
  scene.add(mesh)
}
