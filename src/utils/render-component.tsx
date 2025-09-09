import jscad from "@jscad/modeling"
import type { AnyCircuitElement } from "circuit-json"
import {
  convertCSGToThreeGeom,
  getJscadModelForFootprint,
} from "jscad-electronics/vanilla"
import { executeJscadOperations } from "jscad-planner"
import * as THREE from "three"
import { load3DModel } from "./load-model"
import type { CadComponent } from "circuit-json"
import { getModelUrl } from "./get-model-url"

export async function renderComponent(
  component: CadComponent,
  scene: THREE.Scene,
) {
  // Handle STL/OBJ/WRL/GLTF models first
  const url = getModelUrl(component) ?? component.model_gltf_url
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
    const { geometries } = getJscadModelForFootprint(
      component.footprinter_string,
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
