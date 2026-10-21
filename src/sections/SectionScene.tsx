import { useEffect, useRef } from "react"
import * as THREE from "three"
import { useCameraController } from "../contexts/CameraControllerContext"
import { useFrame, useThree } from "../react-three/ThreeContext"
import { useSection } from "./SectionContext"
import {
  buildSectionCap,
  createSectionHatch,
  findSectionLoops,
  sectionPlane,
  type SectionSpec,
  type Point2,
} from "./section-geometry"

type CapResult = { loops: Point2[][]; openChains: number }
type SavedMaterial = {
  original: THREE.Material | THREE.Material[]
  clipped: THREE.Material | THREE.Material[]
}
const attributeVersion = (
  a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
) => ("version" in a ? a.version : a.data.version)
const materials = (value: THREE.Material | THREE.Material[]) =>
  Array.isArray(value) ? value : [value]

export function SectionScene() {
  const section = useSection()
  const latest = useRef(section)
  latest.current = section
  const { scene, rootObject, camera, renderer } = useThree()
  const { controlsRef } = useCameraController()
  const tick = useRef<() => void>(() => {})
  useFrame(() => tick.current())

  useEffect(() => {
    if (!section) return
    const canvas = renderer.domElement
    const clipping = new THREE.Plane()
    const saved = new Map<THREE.Mesh, SavedMaterial>()
    const caps = new THREE.Group()
    caps.name = "Section caps"
    const helper = new THREE.Group()
    helper.name = "Section plane helper"
    const tile = createSectionHatch()
    const capMaterial = new THREE.MeshBasicMaterial({
      map: tile,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: 0x55caff,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(face.geometry),
      new THREE.LineBasicMaterial({ color: 0x55caff, depthTest: false }),
    )
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(),
      1,
      0x55caff,
    )
    helper.add(face, border, arrow)
    helper.renderOrder = 1000
    scene.add(caps, helper)
    let worker: Worker | undefined
    let workerUrl: string | undefined
    let fallback = false
    // Blob worker keeps package consumers independent of worker asset paths.
    try {
      workerUrl = URL.createObjectURL(
        new Blob(
          [
            `const findSectionLoops = ${findSectionLoops.toString()}; onmessage = e => { const { id, inputs } = e.data; postMessage({ id, results: inputs.map(findSectionLoops) }); };`,
          ],
          { type: "application/javascript" },
        ),
      )
      worker = new Worker(workerUrl)
      worker.onerror = () => {
        fallback = true
        worker?.terminate()
        worker = undefined
        pending = false
        signature = ""
      }
    } catch {
      fallback = true
    }
    let signature = ""
    let revision = 0
    let pending = false
    let lastPoll = 0
    let alive = true
    let bounds = new THREE.Box3()
    let drag: {
      start: number
      offset: number
      origin: THREE.Vector3
      direction: THREE.Vector3
      plane: THREE.Plane
      pointerId: number
      controlsEnabled?: boolean
      autoRotate?: boolean
      axis: SectionSpec["axis"]
      screenY?: number
      unitsPerPixel?: number
    } | null = null

    const clearCaps = () => {
      for (const child of [...caps.children]) {
        caps.remove(child)
        if (child instanceof THREE.Mesh) child.geometry.dispose()
      }
    }
    const showResults = (
      id: number,
      results: CapResult[],
      spec: SectionSpec,
    ) => {
      if (!alive || id !== revision) return
      clearCaps()
      let open = 0
      for (const result of results) {
        open += result.openChains
        const geometry = buildSectionCap(result.loops, spec)
        if (geometry.getAttribute("position").count)
          caps.add(new THREE.Mesh(geometry, capMaterial))
        else geometry.dispose()
      }
      latest.current?.setOpenChains(open)
    }
    const restore = (mesh: THREE.Mesh, entry: SavedMaterial) => {
      if (mesh.material === entry.clipped) mesh.material = entry.original
      materials(entry.clipped).forEach((m) => m.dispose())
      saved.delete(mesh)
    }
    const ray = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      )
      return raycaster
    }
    const stop = () => {
      if (!drag) return
      const previous = drag
      drag = null
      if (canvas.hasPointerCapture?.(previous.pointerId))
        canvas.releasePointerCapture(previous.pointerId)
      if (controlsRef.current) {
        controlsRef.current.enabled = previous.controlsEnabled ?? true
        controlsRef.current.autoRotate = previous.autoRotate ?? false
      }
      canvas.style.cursor = ""
    }
    const down = (event: PointerEvent) => {
      const state = latest.current
      if (
        event.button !== 0 ||
        !state?.spec ||
        !state.editing ||
        !helper.visible
      )
        return
      const cast = ray(event)
      if (!cast.intersectObject(helper, true).length) return
      const direction = new THREE.Vector3()
      direction[state.spec.axis] = 1
      const origin = helper.position.clone()
      // A camera-facing plane containing the movement axis gives stable dragging
      // in perspective and orthographic views without screen-pixel assumptions.
      const view = camera.getWorldDirection(new THREE.Vector3())
      const normal = view.addScaledVector(direction, -view.dot(direction))
      const endOn = normal.lengthSq() < 0.0001
      if (endOn) normal.copy(view)
      normal.normalize()
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        normal,
        origin,
      )
      const hit = cast.ray.intersectPlane(plane, new THREE.Vector3())
      if (!hit) return
      const controls = controlsRef.current
      drag = {
        start: hit.clone().sub(origin).dot(direction),
        offset: state.spec.offset,
        origin,
        direction,
        plane,
        pointerId: event.pointerId,
        controlsEnabled: controls?.enabled,
        autoRotate: controls?.autoRotate,
        axis: state.spec.axis,
      }
      if (endOn && drag) {
        drag.screenY = event.clientY
        drag.unitsPerPixel =
          camera instanceof THREE.OrthographicCamera
            ? (camera.top - camera.bottom) / camera.zoom / canvas.clientHeight
            : camera instanceof THREE.PerspectiveCamera
              ? (2 *
                  camera.position.distanceTo(origin) *
                  Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) /
                canvas.clientHeight
              : 0.1
      }
      if (controls) {
        controls.enabled = false
        controls.autoRotate = false
      }
      event.preventDefault()
      event.stopImmediatePropagation()
      canvas.setPointerCapture(event.pointerId)
      canvas.style.cursor = "grabbing"
    }
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return
      const state = latest.current
      if (!state?.spec) {
        stop()
        return
      }
      const hit = ray(event).ray.intersectPlane(drag.plane, new THREE.Vector3())
      if (!hit) return
      const offset =
        drag.screenY !== undefined
          ? drag.offset + (drag.screenY - event.clientY) * drag.unitsPerPixel!
          : drag.offset + hit.sub(drag.origin).dot(drag.direction) - drag.start
      state.setSpec({
        ...state.spec,
        offset: THREE.MathUtils.clamp(
          offset,
          bounds.min[drag.axis],
          bounds.max[drag.axis],
        ),
      })
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    const up = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return
      event.stopImmediatePropagation()
      stop()
    }
    canvas.addEventListener("pointerdown", down, true)
    canvas.addEventListener("pointermove", move, true)
    canvas.addEventListener("pointerup", up, true)
    canvas.addEventListener("pointercancel", up, true)
    canvas.addEventListener("lostpointercapture", stop)
    window.addEventListener("blur", stop)
    let lastAlign = 0

    tick.current = () => {
      const state = latest.current
      if (!state) return
      const spec = state.spec
      if (!spec || !state.editing) stop()
      helper.visible = Boolean(spec && state.editing)
      if (spec) clipping.copy(sectionPlane(spec))
      rootObject.userData.sectionView = spec
      // Discard caps immediately on movement; never show fills at an old offset.
      const stateKey = spec
        ? `${spec.axis}:${spec.offset}:${spec.flipped}`
        : "off"
      if (caps.userData.stateKey !== stateKey) {
        revision++
        clearCaps()
        caps.userData.stateKey = stateKey
      }
      const now = performance.now()
      if (now - lastPoll < 80) return
      lastPoll = now
      rootObject.updateWorldMatrix(true, true)
      const meshes: THREE.Mesh[] = []
      rootObject.traverseVisible((object) => {
        if (
          object instanceof THREE.Mesh &&
          object.geometry.getAttribute("position") &&
          !object.userData.sectionIgnore
        )
          meshes.push(object)
      })
      const nextBounds = new THREE.Box3()
      for (const mesh of meshes) {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
        nextBounds.union(
          mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld),
        )
      }
      if (!nextBounds.isEmpty() && !nextBounds.equals(bounds)) {
        bounds = nextBounds
        state.setBounds(bounds.clone())
      }
      for (const [mesh, entry] of saved)
        if (!spec || !meshes.includes(mesh) || mesh.material !== entry.clipped)
          restore(mesh, entry)
      if (!spec) {
        renderer.localClippingEnabled = previousClipping
        signature = ""
        return
      }
      for (const mesh of meshes)
        if (!saved.has(mesh)) {
          const original = mesh.material
          const clones = materials(original).map((m) => {
            const clone = m.clone()
            clone.clippingPlanes = [...(m.clippingPlanes ?? []), clipping]
            clone.clipShadows = true
            return clone
          })
          const clipped = Array.isArray(original) ? clones : clones[0]!
          saved.set(mesh, { original, clipped })
          mesh.material = clipped
        }
      renderer.localClippingEnabled = true
      if (!bounds.isEmpty()) {
        const center = bounds.getCenter(new THREE.Vector3())
        center[spec.axis] = spec.offset
        helper.position.copy(center)
        const normal = new THREE.Vector3()
        normal[spec.axis] = 1
        helper.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
        const size = bounds.getSize(new THREE.Vector3())
        const k = spec.axis === "x" ? 0 : spec.axis === "y" ? 1 : 2
        const extent = Math.max(size.x, size.y, size.z, 1)
        const a = size.getComponent((k + 1) % 3) * 1.1 || extent
        const b = size.getComponent((k + 2) % 3) * 1.1 || extent
        // Symmetric helper dimensions avoid orientation surprises across axes.
        face.scale.set(Math.max(a, b), Math.max(a, b), 1)
        border.scale.copy(face.scale)
        arrow.setLength(extent * 0.25, extent * 0.05, extent * 0.025)
        arrow.setDirection(new THREE.Vector3(0, 0, spec.flipped ? -1 : 1))
        if (state.alignRequest !== lastAlign) {
          lastAlign = state.alignRequest
          const distance = camera.position.distanceTo(center) || extent * 2
          camera.position
            .copy(center)
            .addScaledVector(normal, spec.flipped ? distance : -distance)
          camera.up.set(0, spec.axis === "z" ? 1 : 0, spec.axis === "z" ? 0 : 1)
          camera.lookAt(center)
          controlsRef.current?.target.copy(center)
          controlsRef.current?.update()
        }
      }
      const nextSignature =
        stateKey +
        meshes
          .map(
            (m) =>
              `${m.uuid}:${m.geometry.uuid}:${attributeVersion(m.geometry.getAttribute("position"))}:${m.matrixWorld.elements.join(",")}`,
          )
          .join("|")
      if (nextSignature === signature || pending) return
      signature = nextSignature
      const id = ++revision
      const inputs = meshes
        .filter((mesh) => {
          const box = mesh.geometry.boundingBox
          if (!box) return true
          const size = box.getSize(new THREE.Vector3())
          // Texture overlays and other planar sheets have no solid interior.
          return Math.min(size.x, size.y, size.z) > 1e-7
        })
        .map((mesh) => {
          const geometry = mesh.geometry.index
            ? mesh.geometry.toNonIndexed()
            : mesh.geometry
          const position = geometry.getAttribute("position")
          const positions = new Float32Array(position.count * 3)
          const point = new THREE.Vector3()
          for (let i = 0; i < position.count; i++)
            point
              .fromBufferAttribute(position, i)
              .applyMatrix4(mesh.matrixWorld)
              .toArray(positions, i * 3)
          if (geometry !== mesh.geometry) geometry.dispose()
          return { positions, axis: spec.axis, offset: spec.offset }
        })
      if (worker) {
        pending = true
        worker.onmessage = (event) => {
          pending = false
          if (id !== revision) {
            signature = ""
            return
          }
          showResults(id, event.data.results, spec)
        }
        worker.postMessage(
          { id, inputs },
          inputs.map((i) => i.positions.buffer),
        )
      } else if (fallback) showResults(id, inputs.map(findSectionLoops), spec)
    }
    const previousClipping = renderer.localClippingEnabled
    return () => {
      alive = false
      tick.current = () => {}
      stop()
      canvas.removeEventListener("pointerdown", down, true)
      canvas.removeEventListener("pointermove", move, true)
      canvas.removeEventListener("pointerup", up, true)
      canvas.removeEventListener("pointercancel", up, true)
      canvas.removeEventListener("lostpointercapture", stop)
      window.removeEventListener("blur", stop)
      worker?.terminate()
      if (workerUrl) URL.revokeObjectURL(workerUrl)
      for (const [mesh, entry] of saved) restore(mesh, entry)
      renderer.localClippingEnabled = previousClipping
      clearCaps()
      delete rootObject.userData.sectionView
      scene.remove(caps, helper)
      helper.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose()
          materials(object.material).forEach((m) => m.dispose())
        }
      })
      capMaterial.dispose()
      tile.dispose()
    }
  }, [scene, rootObject, camera, renderer, controlsRef, Boolean(section)])
  return null
}
