import jscad from "@jscad/modeling"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCSGToThreeGeom,
  getJscadModelForFootprint,
} from "jscad-electronics/vanilla"
import { executeJscadOperations } from "jscad-planner"
import * as THREE from "three"
import * as jscadModeling from "@jscad/modeling"
import { load3DModel } from "./load-model"
import type { CadComponent } from "circuit-json"

// Standard PCB thickness is 1.4mm, so components sit at ±0.7mm from center
const DEFAULT_BOARD_HALF_THICKNESS = 0.7

export async function renderComponent(
  component: CadComponent,
  scene: THREE.Scene,
) {
  // Determine z-offset based on component layer
  // Top layer (default): components sit above the board (+0.7mm)
  // Bottom layer: components sit below the board (-0.7mm)
  const isBottomLayer = component.layer === "bottom"
  const layerZOffset = isBottomLayer
    ? -DEFAULT_BOARD_HALF_THICKNESS
    : DEFAULT_BOARD_HALF_THICKNESS

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
          (component.position.z ?? 0) + layerZOffset,
        )
      }
      if (component.rotation) {
        model.rotation.set(
          THREE.MathUtils.degToRad(component.rotation.x ?? 0),
          THREE.MathUtils.degToRad(component.rotation.y ?? 0),
          THREE.MathUtils.degToRad(component.rotation.z ?? 0),
        )
      }
      // Flip bottom layer components 180° around X axis
      if (isBottomLayer) {
        model.rotateX(Math.PI)
      }
      scene.add(model)
      return
    }
  }

  // Handle JSCAD models
  if (component.model_jscad) {
    const jscadObject = executeJscadOperations(
      jscad as any,
      component.model_jscad,
    )
    if (jscadObject && (jscadObject.polygons || jscadObject.sides)) {
      const threeGeom = convertCSGToThreeGeom(jscadObject)
      const material = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.5,
        roughness: 0.5,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(threeGeom, material)

      if (component.position) {
        mesh.position.set(
          component.position.x ?? 0,
          component.position.y ?? 0,
          (component.position.z ?? 0) + layerZOffset,
        )
      }
      if (component.rotation) {
        mesh.rotation.set(
          THREE.MathUtils.degToRad(component.rotation.x ?? 0),
          THREE.MathUtils.degToRad(component.rotation.y ?? 0),
          THREE.MathUtils.degToRad(component.rotation.z ?? 0),
        )
      }
      // Flip bottom layer components 180° around X axis
      if (isBottomLayer) {
        mesh.rotateX(Math.PI)
      }
      scene.add(mesh)
    }
    return
  }

  // Handle footprints
  if (component.footprinter_string) {
    const { geometries } = getJscadModelForFootprint(
      component.footprinter_string,
      jscadModeling,
    )

    // Process each operation from the footprinter
    for (const geomInfo of geometries.flat(Infinity) as any[]) {
      const geom = geomInfo.geom
      if (!geom || (!geom.polygons && !geom.sides)) {
        continue
      }

      const color = new THREE.Color(geomInfo.color)
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
          (component.position.z ?? 0) + layerZOffset,
        )
      }
      if (component.rotation) {
        mesh.rotation.set(
          THREE.MathUtils.degToRad(component.rotation.x ?? 0),
          THREE.MathUtils.degToRad(component.rotation.y ?? 0),
          THREE.MathUtils.degToRad(component.rotation.z ?? 0),
        )
      }
      // Flip bottom layer components 180° around X axis
      if (isBottomLayer) {
        mesh.rotateX(Math.PI)
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
      (component.position.z ?? 0) + layerZOffset,
    )
  }
  // Flip bottom layer components 180° around X axis
  if (isBottomLayer) {
    mesh.rotateX(Math.PI)
  }
  scene.add(mesh)
}
