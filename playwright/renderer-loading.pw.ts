import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"

const glb = readFileSync(
  new URL("../tests/assets/prerendered-components.glb", import.meta.url),
)

for (const source of ["url", "bytes"]) {
  test(`GLB ${source} renders without importing or initializing Manifold`, async ({
    page,
  }) => {
    const manifoldRequests: string[] = []
    await page.addInitScript(() =>
      localStorage.setItem("cadViewerEngine", "manifold"),
    )
    await page.route(/manifold/i, (route) => {
      manifoldRequests.push(route.request().url())
      return route.abort()
    })
    await page.route("**/renderer-test.glb", (route) =>
      route.fulfill({ body: glb, contentType: "model/gltf-binary" }),
    )
    await page.goto(`renderer-loading.html?source=${source}`)
    await expect(page.locator("canvas").last()).toBeVisible()
    await expect(page.getByText(/Loading Manifold/i)).toHaveCount(0)
    expect(manifoldRequests).toEqual([])
  })
}

test("Manifold is requested only for Circuit JSON and a failed runtime cannot block a subsequent GLB", async ({
  page,
}) => {
  const rendererRequests: string[] = []
  const runtimeRequests: string[] = []
  await page.addInitScript(() =>
    localStorage.setItem("cadViewerEngine", "manifold"),
  )
  page.on("request", (request) => {
    if (request.url().includes("CadViewerManifold"))
      rendererRequests.push(request.url())
  })
  await page.route(/manifold-3d.*manifold\.(js|wasm)/, (route) => {
    runtimeRequests.push(route.request().url())
    return route.abort()
  })
  await page.route("**/renderer-test.glb", (route) =>
    route.fulfill({ body: glb, contentType: "model/gltf-binary" }),
  )
  await page.goto("renderer-loading.html")
  await expect(page.locator("canvas").last()).toBeVisible()
  expect(rendererRequests).toEqual([])
  expect(runtimeRequests).toEqual([])
  await page
    .getByRole("button", { name: "Use Circuit JSON", exact: true })
    .click()
  await expect.poll(() => rendererRequests.length).toBeGreaterThan(0)
  await expect.poll(() => runtimeRequests.length).toBeGreaterThan(0)
  await expect(
    page.getByText(/Failed to initialize Manifold:/).first(),
  ).toBeVisible()
  await page.getByRole("button", { name: "Use GLB URL", exact: true }).click()
  await expect(page.locator("canvas").last()).toBeVisible()
  await expect(page.getByText(/Failed to initialize Manifold:/)).toHaveCount(0)
})

test("the JSCAD renderer does not import Manifold", async ({ page }) => {
  const manifoldRequests: string[] = []
  await page.addInitScript(() =>
    localStorage.setItem("cadViewerEngine", "jscad"),
  )
  await page.route(/manifold/i, (route) => {
    manifoldRequests.push(route.request().url())
    return route.abort()
  })
  await page.goto("renderer-loading.html?source=json")
  await expect(page.locator("canvas").last()).toBeVisible()
  expect(manifoldRequests).toEqual([])
})
