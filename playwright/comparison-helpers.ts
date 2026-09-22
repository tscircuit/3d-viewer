import { createCanvas, ImageData, loadImage } from "@napi-rs/canvas"
import { expect, type Page, type TestInfo } from "@playwright/test"
import {
  compareGeometryEdges,
  type GeometryImage,
} from "../tests/fixtures/geometry-edge-comparison"
import type {
  CalibrationMutation,
  ComparisonView,
  GeometryCapture,
} from "../tests/fixtures/renderer-parity/types"

export async function openComparison(page: Page, caseId: string) {
  await page.goto(`?case=${encodeURIComponent(caseId)}`)
  await page.waitForFunction(
    () =>
      window.rendererComparison?.status === "ready" ||
      window.rendererComparison?.status === "error",
    null,
    { timeout: 60_000 },
  )
  const status = await page.evaluate(() => ({
    status: window.rendererComparison?.status,
    caseId: window.rendererComparison?.caseId,
    error: window.rendererComparison?.error,
  }))
  if (status.status !== "ready" || status.caseId !== caseId)
    throw new Error(`Renderer harness failed: ${JSON.stringify(status)}`)
}

function pngBytes(dataUrl: string): Buffer {
  const prefix = "data:image/png;base64,"
  if (!dataUrl.startsWith(prefix)) throw new Error("Expected PNG capture")
  return Buffer.from(dataUrl.slice(prefix.length), "base64")
}

async function decode(dataUrl: string): Promise<GeometryImage> {
  const image = await loadImage(pngBytes(dataUrl))
  const canvas = createCanvas(image.width, image.height)
  const context = canvas.getContext("2d")
  context.drawImage(image, 0, 0)
  return {
    width: image.width,
    height: image.height,
    data: context.getImageData(0, 0, image.width, image.height).data,
  }
}

function encode(data: Uint8ClampedArray, width: number, height: number) {
  const canvas = createCanvas(width, height)
  canvas.getContext("2d").putImageData(new ImageData(data, width, height), 0, 0)
  return canvas.toBuffer("image/png")
}

export async function compareCapture(
  page: Page,
  testInfo: TestInfo,
  view: ComparisonView,
  calibration?: CalibrationMutation,
) {
  const capture: GeometryCapture = await page.evaluate(
    async ({ view, calibration }) => {
      if (!window.rendererComparison) throw new Error("Missing comparison API")
      return window.rendererComparison.captureGeometry(view, calibration)
    },
    { view, calibration },
  )
  const prefix = `${view}-${calibration ?? "actual"}`
  const visible = page.locator(
    `[data-testid="geometry-comparison"][data-view="${view}"]`,
  )
  await expect(visible).toHaveAttribute("data-state", "ready")
  await expect(visible).toHaveAttribute("data-view", view)
  await expect(visible).toHaveAttribute(
    "data-mutation",
    calibration ?? "actual",
  )
  await testInfo.attach(`${prefix}-viewer-geometry`, {
    body: pngBytes(capture.leftPng),
    contentType: "image/png",
  })
  await testInfo.attach(`${prefix}-metadata`, {
    body: Buffer.from(
      JSON.stringify(
        {
          ...capture.metadata,
          exportError: capture.exportError,
          exportMessages: capture.exportMessages,
        },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  })
  if (capture.exportError || !capture.rightPng) {
    throw new Error(
      `Exporter did not produce comparable geometry: ${capture.exportError ?? "missing image"}`,
    )
  }
  await testInfo.attach(`${prefix}-exporter-geometry`, {
    body: pngBytes(capture.rightPng),
    contentType: "image/png",
  })
  const a = await decode(capture.leftPng)
  const b = await decode(capture.rightPng)
  const comparison = compareGeometryEdges(a, b)
  const { edgeImageA, edgeImageB, overlay, ...metrics } = comparison
  await expect(visible).toHaveAttribute("data-matches", String(metrics.matches))
  await expect(visible).toHaveAttribute(
    "data-unmatched-a",
    String(metrics.unmatchedFractionA),
  )
  await expect(visible).toHaveAttribute(
    "data-unmatched-b",
    String(metrics.unmatchedFractionB),
  )
  await testInfo.attach(`${prefix}-metrics`, {
    body: Buffer.from(JSON.stringify(metrics, null, 2)),
    contentType: "application/json",
  })
  for (const [name, pixels] of [
    ["viewer-edges", edgeImageA],
    ["exporter-edges", edgeImageB],
    ["edge-diff", overlay],
  ] as const) {
    await testInfo.attach(`${prefix}-${name}`, {
      body: encode(pixels, a.width, a.height),
      contentType: "image/png",
    })
  }
  return { ...metrics, exportMessages: capture.exportMessages }
}
