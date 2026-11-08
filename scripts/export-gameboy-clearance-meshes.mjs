import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"
const output = process.argv[2]
if (!output)
  throw new Error(
    "Usage: node scripts/export-gameboy-clearance-meshes.mjs <output-directory>",
  )
;(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  })
  const page = await browser.newPage()
  await page.goto(
    "http://127.0.0.1:5187/renderer-comparison/gameboy-advance-explosion.html",
  )
  await page.waitForFunction(
    () => {
      let n = 0
      window.__TSCIRCUIT_THREE_OBJECT?.traverse((o) => {
        if (
          o.userData.cad_component_id &&
          Number(o.userData.cad_component_id.split("_").at(-1)) >= 124 &&
          Number(o.userData.cad_component_id.split("_").at(-1)) <= 181
        ) {
          let mesh = false
          o.traverse((c) => {
            if (c.isMesh) mesh = true
          })
          if (mesh) n++
        }
      })
      return n === 58
    },
    null,
    { timeout: 120000 },
  )
  const ids = await page.evaluate(() => {
    const ids = new Set(["pcb"])
    window.__TSCIRCUIT_THREE_OBJECT.traverse((o) => {
      if (o.userData.cad_component_id) ids.add(o.userData.cad_component_id)
    })
    return [...ids]
  })
  fs.mkdirSync(output, { recursive: true })
  for (const selected of ids) {
    const data = await page.evaluate((selected) => {
      const root = window.__TSCIRCUIT_THREE_OBJECT
      root.updateWorldMatrix(true, true)
      const inverse = root.matrixWorld.clone().invert()
      const parts = {}
      root.traverse((o) => {
        if (!o.isMesh || !o.geometry?.attributes.position) return
        let owner = o
        while (owner !== root && !owner.userData.cad_component_id)
          owner = owner.parent
        const id = owner.userData.cad_component_id ?? "pcb"
        if (id !== selected) return
        const part = (parts[id] ??= { vertices: [], faces: [] })
        const matrix = inverse.clone().multiply(o.matrixWorld)
        const position = o.geometry.attributes.position
        const start = part.vertices.length
        const v = root.position.clone()
        for (let i = 0; i < position.count; i++) {
          v.fromBufferAttribute(position, i).applyMatrix4(matrix)
          part.vertices.push(v.toArray())
        }
        const index = o.geometry.index
        const count = index?.count ?? position.count
        for (let i = 0; i < count; i += 3)
          part.faces.push(
            [0, 1, 2].map((j) => start + (index ? index.getX(i + j) : i + j)),
          )
      })
      return JSON.stringify(parts[selected] ?? { vertices: [], faces: [] })
    }, selected)
    fs.writeFileSync(path.join(output, `${selected}.json`), data)
    console.log(selected, data.length)
  }
  await browser.close()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
