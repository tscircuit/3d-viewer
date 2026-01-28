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
// WebGPURenderer is dynamically imported when useWebGPU is true to avoid
// loading browser-only code in Node.js environments
import {
  ThreeContext,
  ThreeContextState,
  RendererType,
  WebGPURendererInterface,
} from "./ThreeContext"
import { HoverProvider } from "./HoverContext"
import { removeExistingCanvases } from "./remove-existing-canvases"
import { configureRenderer } from "./configure-renderer"
import { useCameraController } from "../contexts/CameraControllerContext"

declare global {
  interface Window {
    __TSCIRCUIT_THREE_OBJECT?: THREE.Object3D
  }
}

interface CanvasProps {
  children: React.ReactNode
  scene?: Record<string, any>
  camera?: Record<string, any>
  style?: React.CSSProperties
  useWebGPU?: boolean
  onCreated?: (state: { camera: THREE.Camera; renderer: RendererType }) => void
}

export const Canvas = forwardRef<THREE.Object3D, CanvasProps>(
  (
    {
      children,
      scene: sceneProps,
      camera: cameraProps,
      style,
      useWebGPU,
      onCreated,
    },
    ref,
  ) => {
    const { cameraType } = useCameraController()
    const mountRef = useRef<HTMLDivElement>(null)
    const [contextState, setContextState] = useState<ThreeContextState | null>(
      null,
    )
    const frameListeners = useRef<Array<(time: number, delta: number) => void>>(
      [],
    )
    const onCreatedRef = useRef<typeof onCreated>(undefined)
    onCreatedRef.current = onCreated

    // Store camera state to preserve position when switching camera types
    const savedCameraStateRef = useRef<{
      position: THREE.Vector3
      quaternion: THREE.Quaternion
      up: THREE.Vector3
    } | null>(null)

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

      let isCleanedUp = false
      let animationFrameId: number
      let renderer: RendererType
      let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera
      let handleResize: () => void

      const initRenderer = async () => {
        if (!mountRef.current || isCleanedUp) return

        removeExistingCanvases(mountRef.current)

        if (useWebGPU) {
          const { default: WebGPURenderer } = await import(
            "three/examples/jsm/renderers/webgpu/WebGPURenderer.js"
          )
          renderer = new WebGPURenderer({
            antialias: true,
            alpha: true,
          }) as unknown as WebGPURendererInterface
          await (renderer as WebGPURendererInterface).init()
        } else {
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        }

        if (isCleanedUp) {
          renderer.dispose()
          return
        }

        configureRenderer(renderer)
        renderer.setSize(
          mountRef.current.clientWidth,
          mountRef.current.clientHeight,
        )
        renderer.setPixelRatio(window.devicePixelRatio)
        mountRef.current.appendChild(renderer.domElement)

        const aspect =
          mountRef.current.clientWidth / mountRef.current.clientHeight
        camera =
          cameraType === "perspective"
            ? new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)
            : new THREE.OrthographicCamera(
                -10 * aspect,
                10 * aspect,
                10,
                -10,
                -1000,
                1000,
              )

        // Restore saved camera state if switching camera types, otherwise use props
        if (savedCameraStateRef.current) {
          camera.position.copy(savedCameraStateRef.current.position)
          camera.quaternion.copy(savedCameraStateRef.current.quaternion)
          camera.up.copy(savedCameraStateRef.current.up)
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

        const clock = new THREE.Clock()

        const animate = () => {
          if (isCleanedUp) return
          const time = clock.getElapsedTime()
          const delta = clock.getDelta()
          frameListeners.current.forEach((listener) => listener(time, delta))
          renderer.render(scene, camera)
          animationFrameId = requestAnimationFrame(animate)
        }
        animate()

        handleResize = () => {
          if (mountRef.current) {
            const newAspect =
              mountRef.current.clientWidth / mountRef.current.clientHeight
            if (camera instanceof THREE.PerspectiveCamera) {
              camera.aspect = newAspect
            } else if (camera instanceof THREE.OrthographicCamera) {
              camera.left = -10 * newAspect
              camera.right = 10 * newAspect
              camera.top = 10
              camera.bottom = -10
            }
            camera.updateProjectionMatrix()
            renderer.setSize(
              mountRef.current.clientWidth,
              mountRef.current.clientHeight,
            )
          }
        }
        window.addEventListener("resize", handleResize)
      }

      initRenderer().catch((error) => {
        console.error("Failed to initialize renderer:", error)
      })

      return () => {
        isCleanedUp = true

        // Save camera state before cleanup so it can be restored when switching camera types
        if (camera) {
          savedCameraStateRef.current = {
            position: camera.position.clone(),
            quaternion: camera.quaternion.clone(),
            up: camera.up.clone(),
          }
        }

        if (handleResize) {
          window.removeEventListener("resize", handleResize)
        }
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId)
        }
        if (renderer) {
          if (mountRef.current && renderer.domElement) {
            mountRef.current.removeChild(renderer.domElement)
          }
          renderer.dispose()
        }
        scene.remove(rootObject.current)
        if (window.__TSCIRCUIT_THREE_OBJECT === rootObject.current) {
          window.__TSCIRCUIT_THREE_OBJECT = undefined
        }
      }
    }, [scene, addFrameListener, removeFrameListener, cameraType, useWebGPU])

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
