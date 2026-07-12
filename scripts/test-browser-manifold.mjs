import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { build } from "esbuild"
import { chromium } from "playwright"

const testDir = await mkdtemp(join(tmpdir(), "3d-viewer-manifold-browser-"))
const entryPath = join(testDir, "entry.ts")
const bundlePath = join(testDir, "bundle.js")

await writeFile(
  entryPath,
  `
    import { loadManifoldRuntime } from ${JSON.stringify(
      new URL("../src/utils/manifold/load-manifold-runtime.ts", import.meta.url)
        .pathname,
    )}

    try {
      const module = await loadManifoldRuntime()
      const cube = module.Manifold.cube([2, 3, 4])
      const triangles = cube.numTri()
      cube.delete()
      document.body.dataset.result = triangles > 0 ? "ok" : "empty"
    } catch (error) {
      document.body.dataset.result = "error"
      document.body.dataset.message = String(error?.stack ?? error)
    }
  `,
)

await build({
  entryPoints: [entryPath],
  outfile: bundlePath,
  bundle: true,
  external: ["node:module"],
  format: "esm",
  platform: "browser",
})

const browserBundle = await readFile(bundlePath, "utf8")
assert.equal(browserBundle.includes("manifold-3d"), false)

const server = createServer((request, response) => {
  if (request.url === "/bundle.js") {
    response.setHeader("Content-Type", "text/javascript")
    response.end(browserBundle)
    return
  }
  response.setHeader("Content-Type", "text/html")
  response.end('<body><script type="module" src="/bundle.js"></script></body>')
})

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
const address = server.address()
assert(address && typeof address === "object")

let browser
try {
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${address.port}`)
  await page.waitForFunction(() => document.body.dataset.result)
  const result = await page.locator("body").getAttribute("data-result")
  const message = await page.locator("body").getAttribute("data-message")
  assert.equal(result, "ok", message ?? "Manifold browser runtime failed")
} finally {
  await browser?.close()
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
  await rm(testDir, { recursive: true, force: true })
}
