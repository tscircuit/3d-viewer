import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "@playwright/test"
import type { Mesh, MeshStandardMaterial, Object3D } from "three"

const assetDir = resolve(
  process.env.STORYBOOK_SMOKE_MANIFOLD_DIR ??
    "test-results/storybook-runtime/manifold-3.2.1",
)
const runtime = {
  "manifold.js": {
    type: "text/javascript",
    sha256: "9392f8e3b7f9d3cae83c0e7c5a17acaaf017230b8931b3739fb21ea4c852a0b5",
  },
  "manifold.wasm": {
    type: "application/wasm",
    sha256: "6579d59e4fa4a57b72431c5d35583ef0c6ee0e610ec110d237debb4e85457bce",
  },
} as const
const stories = [
  {
    id: "cadcomponent--ssop-rotated",
    width: 20,
    height: 20,
    components: 1,
    vias: 4,
  },
  { id: "simple2--default", width: 10, height: 40, components: 17, vias: 0 },
  {
    id: "via--multiple-vias-with-board",
    width: 10,
    height: 5,
    components: 0,
    vias: 2,
  },
] as const

// Serve the exact production 3.2.1 JS/WASM pair, not a newer installed version
// under the old URL. Routing changes transport only; all geometry remains real.
test.beforeEach(async ({ page }) => {
  for (const [name, metadata] of Object.entries(runtime)) {
    const body = readFileSync(resolve(assetDir, name))
    expect(createHash("sha256").update(body).digest("hex")).toBe(
      metadata.sha256,
    )
    await page.route(
      "https://cdn.jsdelivr.net/npm/manifold-3d@3.2.1/" + name,
      (route) =>
        route.fulfill({
          body,
          contentType: metadata.type,
          headers: {
            "access-control-allow-origin": "*",
            "cross-origin-resource-policy": "cross-origin",
          },
        }),
    )
  }
})

for (const engine of ["manifold", "jscad"] as const) {
  for (const story of stories) {
    test(
      engine + " renders actual Storybook " + story.id,
      async ({ page }, testInfo) => {
        const errors: string[] = []
        page.on("pageerror", (error) =>
          errors.push(error.stack ?? error.message),
        )
        page.on("console", (message) => {
          if (message.type() === "error") errors.push(message.text())
        })
        await page.addInitScript((selectedEngine) => {
          localStorage.setItem("cadViewerEngine", selectedEngine)
          localStorage.setItem("cadViewerAutoRotate", "false")
        }, engine)
        await page.goto("/iframe.html?id=" + story.id + "&viewMode=story")

        const sceneState = () =>
          page.evaluate(
            ({ engine, story }) => {
              const root = (
                window as Window & {
                  __TSCIRCUIT_THREE_OBJECT?: Object3D
                }
              ).__TSCIRCUIT_THREE_OBJECT
              const meshes: Mesh[] = []
              root?.traverseVisible((object) => {
                if ((object as Mesh).isMesh) meshes.push(object as Mesh)
              })
              const board = meshes.find((mesh) =>
                engine === "manifold"
                  ? mesh.name === "board-geom"
                  : mesh.renderOrder === -1,
              )
              board?.geometry.computeBoundingBox()
              const bounds = board?.geometry.boundingBox
              const boardSize = bounds
                ? [
                    bounds.max.x - bounds.min.x,
                    bounds.max.y - bounds.min.y,
                    bounds.max.z - bounds.min.z,
                  ]
                : []
              const textureNames =
                engine === "manifold"
                  ? ["top-board-texture-plane", "bottom-board-texture-plane"]
                  : ["jscad-top-board-texture", "jscad-bottom-board-texture"]
              const paintedTextures = textureNames.filter((name) => {
                const mesh = meshes.find((mesh) => mesh.name === name)
                const material = mesh?.material
                if (
                  !material ||
                  Array.isArray(material) ||
                  !("map" in material)
                )
                  return false
                const image = (material as MeshStandardMaterial).map?.image as
                  | HTMLCanvasElement
                  | undefined
                if (!image?.width || !image.height || !image.getContext)
                  return false
                const context = image.getContext("2d")
                if (!context) return false
                const data = context.getImageData(
                  0,
                  0,
                  image.width,
                  image.height,
                ).data
                for (let index = 3; index < data.length; index += 4) {
                  if (data[index]! > 0) return true
                }
                return false
              })
              let componentMeshes = 0
              for (const mesh of meshes) {
                let parent: Object3D | null = mesh
                while (parent && !parent.userData.cad_component_id)
                  parent = parent.parent
                // Loading and Error3d boxes must never satisfy model readiness.
                if (
                  parent &&
                  mesh.geometry.type !== "BoxGeometry" &&
                  mesh.renderOrder !== 999999
                )
                  componentMeshes++
              }
              const finiteMeshes = meshes.every((mesh) => {
                const position = mesh.geometry.getAttribute("position")
                return (
                  Boolean(position?.count) &&
                  Array.from(position.array).every(Number.isFinite) &&
                  mesh.matrixWorld.elements.every(Number.isFinite) &&
                  (mesh.geometry.index?.count ?? position.count) >= 3
                )
              })
              const errorFallback = meshes.some(
                (mesh) => mesh.renderOrder === 999999,
              )
              const viaMeshes =
                engine === "manifold"
                  ? meshes.filter((mesh) => mesh.name.startsWith("via-")).length
                  : meshes.filter(
                      (mesh) =>
                        mesh.parent === root &&
                        mesh.name === "" &&
                        mesh.renderOrder !== -1,
                    ).length
              return {
                ready:
                  Boolean(board) &&
                  finiteMeshes &&
                  !errorFallback &&
                  paintedTextures.length === 2 &&
                  Math.abs((boardSize[0] ?? 0) - story.width) < 0.01 &&
                  Math.abs((boardSize[1] ?? 0) - story.height) < 0.01 &&
                  (boardSize[2] ?? 0) > 0.1 &&
                  componentMeshes >= story.components &&
                  viaMeshes === story.vias,
                boardSize,
                paintedTextures,
                componentMeshes,
                viaMeshes,
                errorFallback,
                meshes: meshes.map((mesh) => ({
                  name: mesh.name,
                  vertices: mesh.geometry.getAttribute("position")?.count,
                })),
              }
            },
            { engine, story },
          )

        await expect.poll(async () => (await sceneState()).ready).toBe(true)
        await page.waitForLoadState("networkidle")
        await page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              )
            }),
        )
        await expect(page.locator("#storybook-root")).toBeVisible()
        await expect(page.locator(".sb-errordisplay")).not.toBeVisible()
        expect(errors, "Storybook and viewer render errors").toEqual([])
        await testInfo.attach("rendered-scene", {
          body: Buffer.from(JSON.stringify(await sceneState(), null, 2)),
          contentType: "application/json",
        })
        await testInfo.attach("rendered-story", {
          body: await page.screenshot(),
          contentType: "image/png",
        })
      },
    )
  }
}
