import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react"
import * as THREE from "three"
import { ThreeContext, ThreeContextState } from "./ThreeContext"
import { HoverProvider } from "./HoverContext"
import { removeExistingCanvases } from "./remove-existing-canvases"
import { configureRenderer } from "./configure-renderer"

declare global {
  interface Window {
    __TSCIRCUIT_THREE_OBJECT?: THREE.Object3D
  }
}

type CanvasCameraProps = {
  up?: [number, number, number]
  position?: [number, number, number]
  type?: "perspective" | "orthographic"
  frustumSize?: number
}

interface CanvasProps {
  children: React.ReactNode
  scene?: Record<string, any>
  camera?: CanvasCameraProps
  style?: React.CSSProperties
  onCreated?: (state: {
    camera: THREE.Camera
    renderer: THREE.WebGLRenderer
  }) => void
}

export const Canvas = forwardRef<THREE.Object3D, CanvasProps>(
  (
    { children, scene: sceneProps, camera: cameraProps, style, onCreated },
    ref,
  ) => {
    const mountRef = useRef<HTMLDivElement>(null)
    const [contextState, setContextState] = useState<ThreeContextState | null>(
      null,
    )
    const frameListeners = useRef<Array<(time: number, delta: number) => void>>([])
    const lastOrthographicStateRef = useRef<{
      position: THREE.Vector3
      quaternion: THREE.Quaternion
      up: THREE.Vector3
      zoom: number
      target: THREE.Vector3
    } | null>(null)
    const lastPerspectiveStateRef = useRef<{
      position: THREE.Vector3
      quaternion: THREE.Quaternion
      up: THREE.Vector3
      target: THREE.Vector3
    } | null>(null)
    const currentCameraRef = useRef<THREE.Camera | null>(null)
    const onCreatedRef = useRef<typeof onCreated>(undefined)
    onCreatedRef.current = onCreated


    const addFrameListener = useCallback(
      (listener: (time: number, delta: number) => void) => {
        frameListeners.current.push(listener)
      },
      [],
    )

    const removeFrameListener = useCallback(
      (listener: (time: number, delta: number) => void) => {
        frameListeners.current = frameListeners.current.filter(
          (l) => l !== listener,
        )
      },
      [],
    )

    const scene = useMemo(() => new THREE.Scene(), [])
    if (sceneProps?.up) {
      scene.up.set(sceneProps.up.x, sceneProps.up.y, sceneProps.up.z)
    }

    const rootObject = useRef(new THREE.Object3D())
    useImperativeHandle(ref, () => rootObject.current)

    useEffect(() => {
      if (!mountRef.current) return

      const isOrthographic = cameraProps?.type === "orthographic"

      const existingCamera = currentCameraRef.current
      const wasSwitchingCameraType = existingCamera && (
        (isOrthographic && existingCamera instanceof THREE.PerspectiveCamera) ||
        (!isOrthographic && existingCamera instanceof THREE.OrthographicCamera)
      )

      if (existingCamera) {
        const wasOrthographic =
          existingCamera instanceof THREE.OrthographicCamera

        if (wasOrthographic) {
          const zoom = (existingCamera as THREE.OrthographicCamera).zoom
          lastOrthographicStateRef.current = {
            position: existingCamera.position.clone(),
            quaternion: existingCamera.quaternion.clone(),
            up: existingCamera.up.clone(),
            zoom,
            target: contextState?.controls?.target?.clone() ?? new THREE.Vector3(),
          }
        } else {
          lastPerspectiveStateRef.current = {
            position: existingCamera.position.clone(),
            quaternion: existingCamera.quaternion.clone(),
            up: existingCamera.up.clone(),
            target: contextState?.controls?.target?.clone() ?? new THREE.Vector3(),
          }
        }
      }

      removeExistingCanvases(mountRef.current)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      configureRenderer(renderer)
      const width = mountRef.current.clientWidth || 1
      const height = mountRef.current.clientHeight || 1
      renderer.setSize(width, height)
      renderer.setPixelRatio(window.devicePixelRatio)
      mountRef.current.appendChild(renderer.domElement)

      const frustumSize = cameraProps?.frustumSize ?? 20
      const aspect = width / height || 1

      const camera = isOrthographic
        ? new THREE.OrthographicCamera(
            (-frustumSize * aspect) / 2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            2000,
          )
        : new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)

      currentCameraRef.current = camera

      // Only restore state when explicitly switching camera types
      // Don't restore on circuit changes or first load
      const stateToRestore = wasSwitchingCameraType
        ? isOrthographic
          ? lastPerspectiveStateRef.current
          : lastOrthographicStateRef.current
        : null

      const isRestoringFromOtherType = wasSwitchingCameraType && !!stateToRestore

      if (stateToRestore) {
        camera.position.copy(stateToRestore.position)
        camera.quaternion.copy(stateToRestore.quaternion)
        camera.up.copy(stateToRestore.up)

        if (
          isOrthographic &&
          "zoom" in stateToRestore &&
          typeof stateToRestore.zoom === "number"
        ) {
          ;(camera as THREE.OrthographicCamera).zoom = stateToRestore.zoom
        }

        if (isRestoringFromOtherType) {
          let target: THREE.Vector3
          if (stateToRestore.target) {
            target = stateToRestore.target.clone()
          } else {
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
              camera.quaternion,
            )
            const estimatedDistance = camera.position.length()
            const toOrigin = new THREE.Vector3()
              .sub(camera.position)
              .normalize()
            const dotWithForward = forward.dot(toOrigin)
            if (dotWithForward > 0.5) {
              target = new THREE.Vector3(0, 0, 0)
            } else {
              target = camera.position
                .clone()
                .add(forward.multiplyScalar(estimatedDistance))
            }
          }

          const distance = camera.position.distanceTo(target)

          if (isOrthographic) {
            const perspectiveFOV = 75
            const fovRadians = (perspectiveFOV * Math.PI) / 180
            const visibleHeight =
              2 * Math.tan(fovRadians / 2) * Math.max(distance, 0.1)
            const orthoCameraHeight = frustumSize
            const matchingZoom = Math.max(
              0.1,
              Math.min(10, orthoCameraHeight / visibleHeight),
            )
            ;(camera as THREE.OrthographicCamera).zoom = matchingZoom
            camera.updateProjectionMatrix()
          } else {
            camera.updateProjectionMatrix()
          }

          camera.updateMatrixWorld()
        } else {
          camera.updateProjectionMatrix()
          camera.updateMatrixWorld()
        }
      } else {
        if (cameraProps?.up) {
          camera.up.set(
            cameraProps.up[0],
            cameraProps.up[1],
            cameraProps.up[2],
          )
        }
        if (cameraProps?.position) {
          camera.position.set(
            cameraProps.position[0],
            cameraProps.position[1],
            cameraProps.position[2],
          )
        }
        camera.lookAt(0, 0, 0)
        camera.updateProjectionMatrix()
      }

      scene.add(rootObject.current)
      window.__TSCIRCUIT_THREE_OBJECT = rootObject.current

      setContextState({
        scene,
        camera,
        renderer,
        rootObject: rootObject.current,
        addFrameListener,
        removeFrameListener,
      })
      onCreatedRef.current?.({ camera, renderer })
      let animationFrameId: number
      const clock = new THREE.Clock()

      const animate = () => {
        const time = clock.getElapsedTime()
        const delta = clock.getDelta()
        frameListeners.current.forEach((listener) => listener(time, delta))
        renderer.render(scene, camera)
        animationFrameId = requestAnimationFrame(animate)
      }
      animate()

      const handleResize = () => {
        if (!mountRef.current) return
        const newWidth = mountRef.current.clientWidth || 1
        const newHeight = mountRef.current.clientHeight || 1
        const newAspect = newWidth / newHeight || 1
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.aspect = newAspect
        } else if (camera instanceof THREE.OrthographicCamera) {
          const nextFrustumSize = cameraProps?.frustumSize ?? frustumSize
          const halfHeight = nextFrustumSize / 2
          const halfWidth = halfHeight * newAspect
          camera.left = -halfWidth
          camera.right = halfWidth
          camera.top = halfHeight
          camera.bottom = -halfHeight
        }
        camera.updateProjectionMatrix()
        renderer.setSize(newWidth, newHeight)
      }
      window.addEventListener("resize", handleResize)

      return () => {
        window.removeEventListener("resize", handleResize)
        cancelAnimationFrame(animationFrameId)

        if (mountRef.current && renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement)
        }
        renderer.dispose()
        scene.remove(rootObject.current)
        if (window.__TSCIRCUIT_THREE_OBJECT === rootObject.current) {
          window.__TSCIRCUIT_THREE_OBJECT = undefined
        }
        setContextState(null)
      }
    }, [
      scene,
      addFrameListener,
      removeFrameListener,
      cameraProps?.type,
      cameraProps?.frustumSize,
    ])

    return (
      <div ref={mountRef} style={{ width: "100%", height: "100%", ...style }}>
        {contextState && (
          <ThreeContext.Provider value={contextState}>
            <HoverProvider>{children}</HoverProvider>
          </ThreeContext.Provider>
        )}
      </div>
    )
  },
)
