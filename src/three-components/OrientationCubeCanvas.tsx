import { useEffect, useRef } from "react"
import * as THREE from "three"
import { Text as TroikaText } from "troika-three-text"
import { useCameraController } from "../contexts/CameraControllerContext"
import { zIndexMap } from "../../lib/utils/z-index-map"

function computePointInFront(
  rotationVector: THREE.Euler,
  distance: number,
): THREE.Vector3 {
  // Create a quaternion from the rotation vector
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rotationVector.x, rotationVector.y, rotationVector.z),
  )

  // Create a vector pointing forward (along the negative z-axis)
  const forwardVector = new THREE.Vector3(0, 0, 1)

  // Apply the rotation to the forward vector
  forwardVector.applyQuaternion(quaternion)

  // Scale the rotated vector by the distance
  const result = forwardVector.multiplyScalar(distance)

  return result
}

export const OrientationCubeCanvas = ({
  onUserInteraction,
}: {
  onUserInteraction?: () => void
} = {}) => {
  const {
    mainCameraRef,
    controlsRef,
    controller,
    defaultTarget,
    baseDistance,
  } = useCameraController()
  const containerRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef(controller)
  controllerRef.current = controller
  const defaultTargetRef = useRef(defaultTarget)
  defaultTargetRef.current = defaultTarget
  const baseDistanceRef = useRef(baseDistance)
  baseDistanceRef.current = baseDistance
  const onUserInteractionRef = useRef(onUserInteraction)
  onUserInteractionRef.current = onUserInteraction

  useEffect(() => {
    if (!containerRef.current) return

    // Create canvas
    const container = containerRef.current
    const canvas = document.createElement("canvas")
    container.appendChild(canvas)

    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })
    renderer.setSize(120, 120)
    renderer.setPixelRatio(window.devicePixelRatio)

    // Create scene
    const scene = new THREE.Scene()

    // Create camera
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    camera.up.set(0, 0, 1)
    camera.position.set(0, -2, 0)
    camera.lookAt(0, 0, 0)

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, Math.PI / 2)
    scene.add(ambientLight)

    // Create cube group
    const group = new THREE.Group()
    group.rotation.fromArray([Math.PI / 2, 0, 0])

    const cubeSize = 1

    // Create cube mesh with per-face materials for hover feedback
    const faceMaterials = Array.from(
      { length: 6 },
      () => new THREE.MeshStandardMaterial({ color: "white" }),
    )
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
      faceMaterials,
    )
    group.add(box)

    // Create cube edges
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
      ),
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }),
    )
    group.add(edges)

    scene.add(group)

    // Create text labels
    const distanceFromCenter = 0.51

    const createTextMesh = (
      text: string,
      position: [number, number, number],
      rotation?: [number, number, number],
    ) => {
      const textMesh = new TroikaText()
      textMesh.text = text
      textMesh.position.fromArray(position)
      if (rotation) textMesh.rotation.fromArray(rotation)
      textMesh.color = "black"
      textMesh.fontSize = 0.25
      textMesh.anchorX = "center"
      textMesh.anchorY = "middle"
      textMesh.depthOffset = 0
      textMesh.font = null // Use browser's default sans-serif font
      textMesh.sync()
      return textMesh
    }

    const frontText = createTextMesh("Front", [0, 0, distanceFromCenter])
    const backText = createTextMesh(
      "Back",
      [0, 0, -distanceFromCenter],
      [0, Math.PI, 0],
    )
    const rightText = createTextMesh(
      "Right",
      [distanceFromCenter, 0, 0],
      [0, Math.PI / 2, 0],
    )
    const leftText = createTextMesh(
      "Left",
      [-distanceFromCenter, 0, 0],
      [0, -Math.PI / 2, 0],
    )
    const topText = createTextMesh(
      "Top",
      [0, distanceFromCenter, 0],
      [-Math.PI / 2, 0, 0],
    )
    const bottomText = createTextMesh(
      "Bottom",
      [0, -distanceFromCenter, 0],
      [Math.PI / 2, 0, 0],
    )

    group.add(frontText)
    group.add(backText)
    group.add(rightText)
    group.add(leftText)
    group.add(topText)
    group.add(bottomText)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    const syncCubeCamera = () => {
      if (mainCameraRef.current) {
        const cameraPosition = computePointInFront(
          mainCameraRef.current.rotation ?? new THREE.Euler(0, 0, 0),
          2,
        )
        if (!cameraPosition.equals(camera.position)) {
          camera.position.copy(cameraPosition)
          camera.lookAt(0, 0, 0)
        }
      }
      camera.updateMatrixWorld()
      group.updateMatrixWorld(true)
    }

    const intersectCubeFace = (event: MouseEvent) => {
      syncCubeCamera()
      const rect = canvas.getBoundingClientRect()
      const width = rect.width || 120
      const height = rect.height || 120
      pointer.x = ((event.clientX - rect.left) / width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObject(box, false)
      return hits[0]?.face ?? null
    }

    const resetFaceHighlights = () => {
      for (const material of faceMaterials) {
        material.color.set("white")
      }
      canvas.style.cursor = "default"
    }

    const handleMouseMove = (event: MouseEvent) => {
      const face = intersectCubeFace(event)
      resetFaceHighlights()
      if (face && faceMaterials[face.materialIndex]) {
        faceMaterials[face.materialIndex]!.color.set("#dbeafe")
        canvas.style.cursor = "pointer"
      }
    }

    const handleMouseLeave = () => {
      resetFaceHighlights()
    }

    const handleClick = (event: MouseEvent) => {
      const face = intersectCubeFace(event)
      if (!face) return

      onUserInteractionRef.current?.()
      const target = controlsRef.current?.target ?? defaultTargetRef.current
      const distance = mainCameraRef.current
        ? mainCameraRef.current.position.distanceTo(target) ||
          baseDistanceRef.current
        : baseDistanceRef.current

      const worldNormal = face.normal
        .clone()
        .applyQuaternion(group.quaternion)
        .normalize()

      const nextPosition: [number, number, number] = [
        target.x + worldNormal.x * distance,
        target.y + worldNormal.y * distance,
        target.z + worldNormal.z * distance,
      ]

      if (controllerRef.current) {
        controllerRef.current.animateTo({
          position: nextPosition,
          target: [target.x, target.y, target.z],
          up: [0, 0, 1],
        })
      } else if (mainCameraRef.current) {
        mainCameraRef.current.position.set(...nextPosition)
        mainCameraRef.current.up.set(0, 0, 1)
        mainCameraRef.current.lookAt(target)
        mainCameraRef.current.updateMatrixWorld()
        controlsRef.current?.update()
      }
    }

    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseleave", handleMouseLeave)
    canvas.addEventListener("click", handleClick)

    // Animation loop
    let animationFrameId: number | null = null
    let isVisible = true
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry?.isIntersecting ?? false
    })
    visibilityObserver.observe(canvas)
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      if (!isVisible) return
      syncCubeCamera()

      renderer.render(scene, camera)
    }

    animate()

    // Cleanup
    return () => {
      // StrictMode clears DOM refs before replaying passive effects, so clean up
      // the canvas owned by this effect instead of reading containerRef.current.
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
      canvas.removeEventListener("click", handleClick)
      visibilityObserver.disconnect()
      canvas.remove()

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }

      frontText.dispose()
      backText.dispose()
      rightText.dispose()
      leftText.dispose()
      topText.dispose()
      bottomText.dispose()

      box.geometry.dispose()
      for (const material of faceMaterials) {
        material.dispose()
      }
      edges.geometry.dispose()
      ;(edges.material as THREE.Material).dispose()

      scene.clear()
      renderer.dispose()
      renderer.forceContextLoss()
    }
  }, [mainCameraRef, controlsRef])

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 120,
        height: 120,
        zIndex: zIndexMap.orientationCube,
      }}
    />
  )
}
