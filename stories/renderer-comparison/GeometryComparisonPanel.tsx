import {
  compareGeometryEdges,
  type GeometryImage,
} from "../../tests/fixtures/geometry-edge-comparison"
import type {
  ComparisonView,
  GeometryCapture,
} from "../../tests/fixtures/renderer-parity/types"

type EdgeMetrics = Omit<
  ReturnType<typeof compareGeometryEdges>,
  "edgeImageA" | "edgeImageB" | "overlay"
>

export interface VisibleGeometryComparison {
  capture: GeometryCapture
  metrics?: EdgeMetrics
  viewerEdges?: string
  exporterEdges?: string
  overlay?: string
}

async function decodePng(dataUrl: string): Promise<GeometryImage> {
  if (!dataUrl.startsWith("data:image/png;base64,"))
    throw new Error("Expected a geometry-pass PNG")
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  const canvas = document.createElement("canvas")
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) throw new Error("Unable to decode geometry-pass pixels")
  context.drawImage(image, 0, 0)
  return {
    width: canvas.width,
    height: canvas.height,
    data: context.getImageData(0, 0, canvas.width, canvas.height).data,
  }
}

function encodePng(data: Uint8ClampedArray, width: number, height: number) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Unable to display geometry comparison pixels")
  const image = context.createImageData(width, height)
  image.data.set(data)
  context.putImageData(image, 0, 0)
  return canvas.toDataURL("image/png")
}

/** Display the same capture bytes and pure matcher used by the Playwright tests. */
export async function compareCapturedGeometry(
  capture: GeometryCapture,
): Promise<VisibleGeometryComparison> {
  if (capture.exportError) return { capture }
  if (!capture.rightPng) throw new Error("Missing right-hand geometry capture")
  const [viewer, exporter] = await Promise.all([
    decodePng(capture.leftPng),
    decodePng(capture.rightPng),
  ])
  const { edgeImageA, edgeImageB, overlay, ...metrics } = compareGeometryEdges(
    viewer,
    exporter,
  )
  return {
    capture,
    metrics,
    viewerEdges: encodePng(edgeImageA, viewer.width, viewer.height),
    exporterEdges: encodePng(edgeImageB, viewer.width, viewer.height),
    overlay: encodePng(overlay, viewer.width, viewer.height),
  }
}

function PixelImage({ title, source }: { title: string; source: string }) {
  return (
    <figure style={{ margin: 0, flex: "1 1 300px", maxWidth: 640 }}>
      <figcaption style={{ marginBottom: 8, fontWeight: 600 }}>
        {title}
      </figcaption>
      <a
        href={source}
        download={`${title.replaceAll(" ", "-")}.png`}
        title="Download full-resolution PNG"
      >
        <img
          src={source}
          alt={title}
          style={{
            display: "block",
            width: "100%",
            imageRendering: "pixelated",
            border: "1px solid #aeb9c6",
          }}
        />
      </a>
    </figure>
  )
}

export function GeometryComparisonPanel({
  view,
  pending,
  error,
  comparison,
  fromBelow,
}: {
  view: ComparisonView
  pending: boolean
  error?: string
  comparison: VisibleGeometryComparison | null
  fromBelow: boolean
}) {
  const capture = comparison?.capture
  const metrics = comparison?.metrics
  const rightName =
    capture?.metadata.mutation !== undefined
      ? `Viewer copy (${capture.metadata.mutation})`
      : "circuit-json-to-gltf"
  return (
    <section
      data-testid="geometry-comparison"
      data-state={
        pending ? "comparing" : error ? "error" : comparison ? "ready" : "idle"
      }
      data-view={view}
      data-from-below={capture?.metadata.cameraFromBelow}
      data-mutation={capture?.metadata.mutation ?? "actual"}
      data-matches={metrics?.matches}
      data-unmatched-a={metrics?.unmatchedFractionA}
      data-unmatched-b={metrics?.unmatchedFractionB}
      style={{ marginTop: 24, paddingTop: 16, borderTop: "2px solid #cbd4df" }}
    >
      <h2>Compared geometry pixels: {view}</h2>
      <p>
        These are the exact no-texture, no-lighting PNGs and edge maps used by
        the automated matcher, not screenshot baselines.
        {fromBelow && " This fixture is viewed from below the PCB."}
      </p>
      {!comparison && !pending && !error && (
        <p>Waiting for model geometry...</p>
      )}
      {pending && <p role="status">Capturing and comparing geometry...</p>}
      {error && <p role="alert">{error}</p>}
      {capture && (
        <>
          <p>
            View: <strong>{capture.metadata.view}</strong>
            {capture.metadata.cameraFromBelow ? " from below" : " from above"}.
            Resolution: {capture.width} x {capture.height}.
          </p>
          <p>
            Camera origin in P: (
            {capture.metadata.cameraPosition
              .map((value) => value.toFixed(2))
              .join(", ")}
            ). Target: (
            {capture.metadata.cameraTarget
              .map((value) => value.toFixed(2))
              .join(", ")}
            ).
          </p>
          {metrics && (
            <p role="status">
              <strong>{metrics.matches ? "MATCH" : "DIFFERENCE"}</strong>
              {" | "}Unmatched edges: left{" "}
              {(metrics.unmatchedFractionA * 100).toFixed(2)}%, right{" "}
              {(metrics.unmatchedFractionB * 100).toFixed(2)}%. Tolerance:{" "}
              {metrics.tolerancePx}px; limit{" "}
              {(metrics.maxUnmatchedFraction * 100).toFixed(2)}% per side.
              {metrics.reason && ` ${metrics.reason}`}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <PixelImage
              title="3d-viewer geometry pass"
              source={capture.leftPng}
            />
            {capture.rightPng ? (
              <PixelImage
                title={`${rightName} geometry pass`}
                source={capture.rightPng}
              />
            ) : (
              <p role="alert">
                {capture.exportError ?? "No right-hand geometry was produced."}
              </p>
            )}
          </div>
          {comparison?.viewerEdges &&
            comparison.exporterEdges &&
            comparison.overlay && (
              <>
                <h3>Edges and fuzzy-match overlay</h3>
                <p>
                  Red: unmatched left edges. Cyan: unmatched right edges. Gray:
                  covered edges.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                  <PixelImage
                    title="3d-viewer edges"
                    source={comparison.viewerEdges}
                  />
                  <PixelImage
                    title={`${rightName} edges`}
                    source={comparison.exporterEdges}
                  />
                  <PixelImage
                    title="Fuzzy edge comparison overlay"
                    source={comparison.overlay}
                  />
                </div>
              </>
            )}
        </>
      )}
    </section>
  )
}
