import { describe, it, expect } from "bun:test"

/**
 * Tests for the usePcbTexture memoization hash function.
 *
 * We extract and test the hashing logic independently to verify that
 * identical circuit JSON produces the same hash, and different data
 * produces different hashes.
 */

function hashCircuitJson(circuitJson: unknown[]): string {
  const raw = JSON.stringify(circuitJson)
  let hash = 5381
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(16)
}

describe("hashCircuitJson (usePcbTexture memoization)", () => {
  it("returns the same hash for identical data", () => {
    const data = [{ type: "pcb_board", width: 10, height: 5 }]
    const copy = JSON.parse(JSON.stringify(data))
    expect(hashCircuitJson(data)).toBe(hashCircuitJson(copy))
  })

  it("returns different hashes for different data", () => {
    const a = [{ type: "pcb_board", width: 10, height: 5 }]
    const b = [{ type: "pcb_board", width: 20, height: 5 }]
    expect(hashCircuitJson(a)).not.toBe(hashCircuitJson(b))
  })

  it("handles empty arrays", () => {
    expect(hashCircuitJson([])).toBe(hashCircuitJson([]))
  })

  it("produces a hex string", () => {
    const hash = hashCircuitJson([{ type: "test" }])
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })
})
