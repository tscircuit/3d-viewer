import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createHash } from "node:crypto"

const target = resolve(
  process.env.STORYBOOK_SMOKE_MANIFOLD_DIR ??
    "test-results/storybook-runtime/manifold-3.2.1",
)
const hashes = {
  "manifold.js":
    "9392f8e3b7f9d3cae83c0e7c5a17acaaf017230b8931b3739fb21ea4c852a0b5",
  "manifold.wasm":
    "6579d59e4fa4a57b72431c5d35583ef0c6ee0e610ec110d237debb4e85457bce",
}
function verify() {
  return Object.entries(hashes).every(([name, hash]) => {
    try {
      return (
        createHash("sha256")
          .update(readFileSync(resolve(target, name)))
          .digest("hex") === hash
      )
    } catch {
      return false
    }
  })
}
if (!verify()) {
  mkdirSync(target, { recursive: true })
  const output = execFileSync(
    "npm",
    [
      "pack",
      "manifold-3d@3.2.1",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      target,
    ],
    { encoding: "utf8" },
  )
  const [{ filename }] = JSON.parse(output)
  execFileSync("tar", [
    "-xzf",
    resolve(target, filename),
    "-C",
    target,
    "--strip-components=1",
    "package/manifold.js",
    "package/manifold.wasm",
  ])
}
if (!verify())
  throw new Error(
    "Manifold3.2.1 runtime bytes do not match the production loader",
  )
console.log(
  "Verified real Manifold3.2.1 JavaScript and WASM for Storybook smoke",
)
