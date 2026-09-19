import type { CadComponent } from "circuit-json"
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import * as THREE from "three"
import { GLTFLoader } from "three-stdlib"
import { CadViewerContainer } from "../../src/CadViewerContainer"
import { CadViewerJscad } from "../../src/CadViewerJscad"
import {
  AppearanceProvider,
  useAppearance,
} from "../../src/contexts/appearance-context"
import {
  CameraControllerProvider,
  useCameraController,
} from "../../src/contexts/CameraControllerContext"
import { LayerVisibilityProvider } from "../../src/contexts/LayerVisibilityContext"
import { ToastProvider } from "../../src/contexts/ToastContext"
import { useFrame, useThree } from "../../src/react-three/ThreeContext"
import type {
  ComparisonManifest,
  CalibrationMutation,
  ComparisonView,
  PreparedComparison,
  RendererComparisonApi,
} from "../../tests/fixtures/renderer-parity/types"
import {
  CAPTURE_SIZE,
  captureGeometry,
  comparisonCamera,
  CREASE_THRESHOLD_DEGREES,
  vertexCount,
} from "./geometry-capture"
import {
  compareCapturedGeometry,
  GeometryComparisonPanel,
  type VisibleGeometryComparison,
} from "./GeometryComparisonPanel"

const assetBase = "/renderer-comparison/"
const exportToProject = new THREE.Matrix4().set(
  -1,
  0,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  1,
)

function resolveStaticAsset(path: string) {
  const url = new URL(path, `${location.origin}${assetBase}`)
  if (url.origin !== location.origin || !url.pathname.startsWith(assetBase)) {
    throw new Error(`Comparison models must be local assets: ${path}`)
  }
  return url.href
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

class ComparisonBoundary extends Component<
  {
    children: ReactNode
    failed: (message: string) => void
  },
  { error: string | null }
> {
  override state: { error: string | null } = { error: null }
  static getDerivedStateFromError(error: unknown) {
    return { error: errorMessage(error) }
  }
  override componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.failed(error.message)
  }
  override render() {
    return this.state.error ? (
      <p role="alert">{this.state.error}</p>
    ) : (
      this.props.children
    )
  }
}

function FixedPanelCamera({
  fixture,
  view,
}: {
  fixture: PreparedComparison
  view: ComparisonView
}) {
  const { mainCameraRef, controlsRef } = useCameraController()
  const { setLightingEnabled } = useAppearance()
  useEffect(() => {
    setLightingEnabled(true)
  }, [setLightingEnabled])
  useEffect(() => {
    let frame = 0
    const fixed = comparisonCamera(fixture, view)
    const apply = () => {
      const camera = mainCameraRef.current
      const controls = controlsRef.current
      if (controls) {
        controls.enabled = false
        controls.enableDamping = false
        controls.target.fromArray(fixture.camera.target)
      }
      if (camera instanceof THREE.OrthographicCamera) camera.copy(fixed)
      frame = requestAnimationFrame(apply)
    }
    frame = requestAnimationFrame(apply)
    return () => cancelAnimationFrame(frame)
  }, [fixture, view, mainCameraRef, controlsRef])
  return null
}

function Providers({
  fixture,
  view,
  children,
}: {
  fixture: PreparedComparison
  view: ComparisonView
  children: ReactNode
}) {
  const target = useMemo(
    () => new THREE.Vector3(...fixture.camera.target),
    [fixture],
  )
  return (
    <CameraControllerProvider
      defaultTarget={target}
      initialCameraType="orthographic"
    >
      <LayerVisibilityProvider>
        <AppearanceProvider>
          <ToastProvider>
            <FixedPanelCamera fixture={fixture} view={view} />
            {children}
          </ToastProvider>
        </AppearanceProvider>
      </LayerVisibilityProvider>
    </CameraControllerProvider>
  )
}

function disposeExport(object: THREE.Object3D) {
  const textures = new Set<THREE.Texture>()
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    child.geometry.dispose()
    for (const material of Array.isArray(child.material)
      ? child.material
      : [child.material]) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value)
      }
      material.dispose()
    }
  })
  for (const texture of textures) texture.dispose()
}

function ExportedModel({
  url,
  sourceName,
  loaded,
  failed,
}: {
  url: string
  sourceName: string
  loaded: (object: THREE.Object3D) => void
  failed: (message: string) => void
}) {
  const { rootObject } = useThree()
  const pending = useRef<THREE.Object3D | null>(null)
  const frames = useRef(0)
  useFrame(() => {
    if (!pending.current || ++frames.current < 3) return
    pending.current.updateWorldMatrix(true, true)
    loaded(pending.current)
    pending.current = null
  }, [loaded])
  useEffect(() => {
    let active = true
    let root: THREE.Group | null = null
    const manager = new THREE.LoadingManager()
    manager.setURLModifier((path) => {
      // GLTFLoader creates blob URLs for images embedded in a GLB. They are
      // already local resources, not paths beneath the fixture server.
      if (path.startsWith("data:")) return path
      const resource = new URL(path, `${location.origin}${assetBase}`)
      if (resource.protocol === "blob:" && resource.origin === location.origin)
        return resource.href
      return resolveStaticAsset(path)
    })
    manager.onError = (path) => {
      if (active) failed(`Exported GLB resource failed to load: ${path}`)
    }
    new GLTFLoader(manager)
      .loadAsync(resolveStaticAsset(url))
      .then((gltf) => {
        if (!active) {
          disposeExport(gltf.scene)
          return
        }
        root = new THREE.Group()
        root.name = "exporter-G-to-project-P"
        root.matrixAutoUpdate = false
        root.matrix.copy(exportToProject)
        root.add(gltf.scene)
        rootObject.add(root)
        root.updateWorldMatrix(true, true)
        const candidates: THREE.Object3D[] = []
        root.traverse((object) => {
          if (object.name === sourceName) candidates.push(object)
        })
        if (
          candidates.length !== 1 ||
          !candidates[0] ||
          !vertexCount(candidates[0])
        ) {
          throw new Error(
            `Expected one nonempty exported node named "${sourceName}", found ${candidates.length}`,
          )
        }
        frames.current = 0
        pending.current = candidates[0]
      })
      .catch((error: unknown) => {
        if (active) failed(`Exported GLB: ${errorMessage(error)}`)
      })
    return () => {
      active = false
      pending.current = null
      if (root) {
        root.removeFromParent()
        disposeExport(root)
      }
    }
  }, [url, sourceName, rootObject, failed])
  return null
}

function findViewerTarget(root: THREE.Object3D, target: CadComponent) {
  const anchor = new THREE.Vector3(
    target.position.x,
    target.position.y,
    target.position.z,
  )
  const candidates = root.children.filter(
    (object) =>
      object instanceof THREE.Group &&
      object.position.distanceTo(anchor) < 0.00001,
  )
  if (candidates.length > 1) {
    throw new Error(
      `Ambiguous viewer CAD anchor: ${candidates.length} groups for ${target.cad_component_id}`,
    )
  }
  const candidate = candidates[0]
  if (!candidate) return null
  // Error3d mounts a direct error box/text instead of the production transform graph.
  if (
    candidate.children.some(
      (child) => child instanceof THREE.Mesh && child.renderOrder === 999999,
    )
  ) {
    const text = candidate.children.find((child) => "text" in child)
    throw new Error(
      `Viewer model load failed: ${text && "text" in text ? String(text.text) : target.cad_component_id}`,
    )
  }
  // useCadModelTransformGraph: board -> fit -> model -> loader -> loaded asset.
  // MixedStlModel initially inserts a fallback Mesh, not the loader's real Group.
  const asset = candidate.children[0]?.children[0]?.children[0]?.children[0]
  if (!(asset instanceof THREE.Group) || !vertexCount(asset)) return null
  return candidate
}

function LoadedComparison({
  fixture,
  view,
  exporterVersion,
  failed,
  onReady,
}: {
  fixture: PreparedComparison
  view: ComparisonView
  exporterVersion: string
  failed: (message: string) => void
  onReady: (viewer: THREE.Object3D, exporter: THREE.Object3D | null) => void
}) {
  const viewerRoot = useRef<THREE.Object3D>(null)
  const viewer = useRef<THREE.Object3D | null>(null)
  const exporter = useRef<THREE.Object3D | null>(null)
  const published = useRef(false)
  const isCalibration = fixture.id === "calibration"
  const target = fixture.circuitJson.find(
    (element): element is CadComponent =>
      element.type === "cad_component" &&
      element.cad_component_id === fixture.targetCadId,
  )
  if (!target)
    throw new Error(`Missing target CAD component ${fixture.targetCadId}`)
  const source = fixture.circuitJson.find(
    (element) =>
      element.type === "source_component" &&
      element.source_component_id === target.source_component_id,
  )
  if (!source || source.type !== "source_component" || !source.name) {
    throw new Error(`Missing source component name for ${fixture.targetCadId}`)
  }
  if (!isCalibration && !fixture.glbUrl && !fixture.exportError) {
    throw new Error(
      "Manifest has neither an exported GLB nor an exporter failure",
    )
  }
  const board = fixture.circuitJson.find(
    (element) => element.type === "pcb_board",
  )
  const publish = useCallback(() => {
    if (
      !published.current &&
      viewer.current &&
      (isCalibration || exporter.current || fixture.exportError)
    ) {
      published.current = true
      onReady(viewer.current, exporter.current)
    }
  }, [isCalibration, fixture.exportError, onReady])
  const loaded = useCallback(
    (object: THREE.Object3D) => {
      exporter.current = object
      publish()
    },
    [publish],
  )
  useEffect(() => {
    let frame = 0
    let previous = ""
    let stableFrames = 0
    const deadline = performance.now() + 30000
    const inspect = () => {
      try {
        if (performance.now() > deadline) {
          throw new Error(
            `Viewer never loaded a unique nonempty CAD subtree for ${fixture.targetCadId}`,
          )
        }
        const object =
          viewerRoot.current && findViewerTarget(viewerRoot.current, target)
        if (object) {
          object.updateWorldMatrix(true, true)
          const parts: string[] = []
          object.traverse((child) => {
            parts.push(child.uuid, child.matrixWorld.elements.join(","))
            if (child instanceof THREE.Mesh)
              parts.push(child.geometry.uuid, String(vertexCount(child)))
          })
          const signature = parts.join("|")
          stableFrames = signature === previous ? stableFrames + 1 : 0
          previous = signature
          if (stableFrames >= 3) {
            viewer.current = object
            publish()
            return
          }
        } else {
          stableFrames = 0
          previous = ""
        }
        frame = requestAnimationFrame(inspect)
      } catch (error) {
        failed(errorMessage(error))
      }
    }
    frame = requestAnimationFrame(inspect)
    return () => cancelAnimationFrame(frame)
  }, [fixture.targetCadId, target, failed, publish])
  return (
    <>
      <h1>{fixture.title}</h1>
      <p>{fixture.description}</p>
      <p>
        Camera: {view}, viewed from{" "}
        {fixture.camera.fromBelow ? "below" : "above"} the PCB.
      </p>
      <p>
        CAD {fixture.targetCadId}; source {source.name}; authored XYZ angles
        (degrees):{" "}
        {target.rotation
          ? JSON.stringify(target.rotation)
          : "absent (implicit layer fallback)"}
        .
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <section>
          <h2>Production 3d-viewer</h2>
          <div style={{ width: CAPTURE_SIZE, height: CAPTURE_SIZE }}>
            <Providers fixture={fixture} view={view}>
              <CadViewerJscad
                ref={viewerRoot}
                circuitJson={fixture.circuitJson}
                autoRotateDisabled
                resolveStaticAsset={resolveStaticAsset}
              />
            </Providers>
          </div>
        </section>
        <section>
          <h2>
            {isCalibration
              ? "Viewer-only calibration"
              : `Exported GLB (${exporterVersion})`}
          </h2>
          <div style={{ width: CAPTURE_SIZE, height: CAPTURE_SIZE }}>
            {isCalibration ? (
              <p>
                Both calibration images use detached copies of the viewer's
                loaded geometry. No exported GLB is generated or loaded, so
                exporter failures cannot block matcher calibration.
              </p>
            ) : fixture.exportError ? (
              <div role="alert">
                <h3>Exporter preparation failed</h3>
                <pre style={{ whiteSpace: "pre-wrap" }}>
                  {fixture.exportError}
                </pre>
                <p>
                  Viewer evidence remains available. No exported geometry is
                  substituted.
                </p>
              </div>
            ) : (
              fixture.glbUrl && (
                <Providers fixture={fixture} view={view}>
                  <CadViewerContainer
                    autoRotateDisabled
                    boardDimensions={
                      board
                        ? { width: board.width, height: board.height }
                        : undefined
                    }
                    boardCenter={board?.center}
                  >
                    <ExportedModel
                      url={fixture.glbUrl}
                      sourceName={source.name}
                      loaded={loaded}
                      failed={failed}
                    />
                  </CadViewerContainer>
                </Providers>
              )
            )}
          </div>
        </section>
      </div>
      <p>
        Only the final exporter basis is normalized: P=(-G.x,G.z,G.y),
        determinant +1. CAD placement, origin, fit and loader transforms are
        untouched.
      </p>
      <p>
        Ready means the actual target meshes have loaded and their transforms
        have settled over consecutive frames; an exporter preparation failure is
        retained as evidence, not geometry.
      </p>
      <p>
        Geometry captures isolate this CAD component: identical {CAPTURE_SIZE}x
        {CAPTURE_SIZE} orthographic cameras, black background, white
        double-sided unlit surfaces and depth-tested black crease lines at{" "}
        {CREASE_THRESHOLD_DEGREES} degrees. No board, labels, grid, recentering,
        rescaling or golden image.
      </p>
      {fixture.id === "calibration" && (
        <p>
          Calibration is test-only: both captures clone this same viewer
          subtree; only the second copy receives the requested mutation.
        </p>
      )}
      {!isCalibration && fixture.exportMessages.length > 0 && (
        <details open>
          <summary>Exporter messages / warnings</summary>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {fixture.exportMessages.join("\n")}
          </pre>
        </details>
      )}
    </>
  )
}

function ComparisonSession({ caseId }: { caseId: string }) {
  const [manifest, setManifest] = useState<ComparisonManifest | null>(null)
  const [status, setStatus] =
    useState<RendererComparisonApi["status"]>("loading")
  const [error, setError] = useState<string>()
  const [activeView, setActiveView] = useState<ComparisonView>("oblique")
  const [comparisons, setComparisons] = useState<
    Partial<Record<ComparisonView, VisibleGeometryComparison>>
  >({})
  const [pendingViews, setPendingViews] = useState<
    Partial<Record<ComparisonView, boolean>>
  >({})
  const [comparisonErrors, setComparisonErrors] = useState<
    Partial<Record<ComparisonView, string | undefined>>
  >({})
  const targets = useRef<{
    fixture: PreparedComparison
    viewer: THREE.Object3D
    exporter: THREE.Object3D | null
  } | null>(null)
  const captureView = useCallback(
    async (view: ComparisonView, calibration?: CalibrationMutation) => {
      const current = targets.current
      if (!current) throw new Error("Comparison geometry is unavailable")
      setPendingViews((previous) => ({ ...previous, [view]: true }))
      setComparisonErrors((previous) => ({ ...previous, [view]: undefined }))
      try {
        const capture = captureGeometry(
          current.fixture,
          current.viewer,
          current.exporter,
          view,
          calibration,
        )
        const result = await compareCapturedGeometry(capture)
        if (targets.current !== current)
          throw new Error("Comparison changed while geometry was captured")
        setComparisons((previous) => ({ ...previous, [view]: result }))
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        )
        return capture
      } catch (reason) {
        if (targets.current === current) {
          setComparisonErrors((previous) => ({
            ...previous,
            [view]: errorMessage(reason),
          }))
        }
        throw reason
      } finally {
        setPendingViews((previous) => ({ ...previous, [view]: false }))
      }
    },
    [],
  )
  const api = useMemo<RendererComparisonApi>(
    () => ({
      status: "loading",
      caseId,
      captureGeometry: async (view, calibration) => {
        if (api.status !== "ready" || !targets.current) {
          throw new Error(api.error ?? `Comparison ${caseId} is not ready`)
        }
        setActiveView(view)
        return captureView(view, calibration)
      },
    }),
    [caseId, captureView],
  )
  const failed = useCallback(
    (message: string) => {
      api.status = "error"
      api.error = message
      setError(message)
      setStatus("error")
    },
    [api],
  )
  const fixture = manifest?.cases.find((entry) => entry.id === caseId)
  const ready = useCallback(
    (viewer: THREE.Object3D, exporter: THREE.Object3D | null) => {
      if (!fixture || api.status === "error") return
      targets.current = { fixture, viewer, exporter }
      // Publish readiness only after both initial panels have completed, so
      // automated callers cannot race the automatic captures.
      void (async () => {
        const mutation = fixture.id === "calibration" ? "none" : undefined
        for (const view of ["oblique", "side"] as const) {
          await captureView(view, mutation)
        }
        if (targets.current && api.status !== "error") {
          api.status = "ready"
          setStatus("ready")
        }
      })().catch((reason: unknown) => {
        if (targets.current) failed(errorMessage(reason))
      })
    },
    [fixture, api, captureView, failed],
  )
  useEffect(() => {
    api.status = "loading"
    delete api.error
    window.rendererComparison = api
    const controller = new AbortController()
    fetch(`${assetBase}generated/manifest.json`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Comparison manifest: HTTP ${response.status}`)
        const data: ComparisonManifest = await response.json()
        if (!data.cases.some((entry) => entry.id === caseId)) {
          throw new Error(`Unknown comparison case: ${caseId}`)
        }
        if (!controller.signal.aborted) setManifest(data)
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) failed(errorMessage(reason))
      })
    return () => {
      controller.abort()
      api.status = "error"
      api.error = "Comparison unmounted"
      targets.current = null
      if (window.rendererComparison === api) delete window.rendererComparison
    }
  }, [api, caseId, failed])
  return (
    <main
      data-testid="renderer-comparison"
      style={{
        padding: 16,
        fontFamily: "sans-serif",
        color: "#17212b",
        background: "#fff",
      }}
    >
      <p role="status">
        {caseId}: {status}
      </p>
      {error && (
        <pre role="alert" style={{ whiteSpace: "pre-wrap", color: "#a00" }}>
          {error}
        </pre>
      )}
      {fixture && manifest && (
        <section data-testid="renderer-comparison-context">
          <ComparisonBoundary failed={failed}>
            <LoadedComparison
              fixture={fixture}
              view={activeView}
              exporterVersion={manifest.exporterVersion}
              failed={failed}
              onReady={ready}
            />
          </ComparisonBoundary>
        </section>
      )}
      {(["oblique", "side"] as const).map((view) => (
        <GeometryComparisonPanel
          key={view}
          view={view}
          pending={Boolean(pendingViews[view])}
          error={comparisonErrors[view]}
          comparison={comparisons[view] ?? null}
          fromBelow={Boolean(fixture?.camera.fromBelow)}
        />
      ))}
    </main>
  )
}

export function RendererComparison({
  caseId = "clip-x37-explicit-origin",
}: {
  caseId?: string
}) {
  return <ComparisonSession key={caseId} caseId={caseId} />
}
