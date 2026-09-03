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

    // The renderer is created once and reused across camera-type changes so we
    // don't churn through WebGL contexts (the browser will force-lose leaked
    // contexts, which crashes three.js on the next shader compile).
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    // The active camera lives in a ref so the animation and resize loops always
    // read the current camera even after a camera-type switch replaces it.
    const cameraRef = useRef<THREE.Camera | null>(null)

    // Renderer + render loop: set up once on mount, torn down on unmount.
    useEffect(() => {
      if (!mountRef.current) return
      const mount = mountRef.current

      removeExistingCanvases(mount)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      configureRenderer(renderer)
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      renderer.setPixelRatio(window.devicePixelRatio)
      mount.appendChild(renderer.domElement)
      rendererRef.current = renderer

      scene.add(rootObject.current)
      window.__TSCIRCUIT_THREE_OBJECT = rootObject.current

      let animationFrameId: number
      const clock = new THREE.Clock()

      const animate = () => {
        const time = clock.getElapsedTime()
        const delta = clock.getDelta()
        frameListeners.current.forEach((listener) => listener(time, delta))
        if (cameraRef.current) {
          renderer.render(scene, cameraRef.current)
        }
        animationFrameId = requestAnimationFrame(animate)
      }
      animate()

      const handleResize = () => {
        if (!mountRef.current) return
        const newAspect =
          mountRef.current.clientWidth / mountRef.current.clientHeight
        const camera = cameraRef.current
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.aspect = newAspect
          camera.updateProjectionMatrix()
        } else if (camera instanceof THREE.OrthographicCamera) {
          camera.left = -10 * newAspect
          camera.right = 10 * newAspect
          camera.top = 10
          camera.bottom = -10
          camera.updateProjectionMatrix()
        }
        renderer.setSize(
          mountRef.current.clientWidth,
          mountRef.current.clientHeight,
        )
      }
      window.addEventListener("resize", handleResize)

      return () => {
        window.removeEventListener("resize", handleResize)
        cancelAnimationFrame(animationFrameId)
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement)
        }
        renderer.dispose()
        // Free the underlying GPU context. Without this, disposed renderers leak
        // their WebGL context until the browser force-loses one, at which point
        // three.js calls shaderSource() on a dead context and throws.
        renderer.forceContextLoss()
        rendererRef.current = null
        scene.remove(rootObject.current)
        if (window.__TSCIRCUIT_THREE_OBJECT === rootObject.current) {
          window.__TSCIRCUIT_THREE_OBJECT = undefined
        }
      }
    }, [scene, addFrameListener, removeFrameListener])

    // Camera: rebuilt when the camera type changes, without recreating the
    // renderer (and therefore without spawning a new WebGL context).
    useEffect(() => {
      if (!mountRef.current || !rendererRef.current) return
      const renderer = rendererRef.current

      const aspect =
        mountRef.current.clientWidth / mountRef.current.clientHeight
      const camera =
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
          camera.up.set(cameraProps.up[0], cameraProps.up[1], cameraProps.up[2])
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

      cameraRef.current = camera

      setContextState({
        scene,
        camera,
        renderer,
        rootObject: rootObject.current,
        addFrameListener,
        removeFrameListener,
      })
      onCreatedRef.current?.({ camera, renderer })

      return () => {
        // Save camera state before cleanup so it can be restored when switching camera types
        savedCameraStateRef.current = {
          position: camera.position.clone(),
          quaternion: camera.quaternion.clone(),
          up: camera.up.clone(),
        }
      }
    }, [scene, addFrameListener, removeFrameListener, cameraType])

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
