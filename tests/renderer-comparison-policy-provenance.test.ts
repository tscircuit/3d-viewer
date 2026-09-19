import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import {
  policyFixtureMetadata,
  policyModelMetadata,
} from "./fixtures/renderer-parity/policy-inputs"

test("captured policy inputs and model assets retain their documented hashes", async () => {
  for (const entry of [...policyModelMetadata, ...policyFixtureMetadata]) {
    const path = "source" in entry ? entry.source : entry.seed
    const bytes = new Uint8Array(
      await Bun.file(`${import.meta.dir}/../${path}`).arrayBuffer(),
    )
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(entry.sha256)
  }
})
