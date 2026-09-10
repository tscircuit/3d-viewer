import { expect, test } from "bun:test"
import { getGlobalObjLoaderCacheKey } from "../src/hooks/use-global-obj-loader"

test("uses the same OBJ cache key when only cachebust_origin changes", () => {
  const first = getGlobalObjLoaderCacheKey(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=c886ec2b42464573a88fc1f647577a49&pn=C5184526&cachebust_origin=https%3A%2F%2Ftscircuit.com",
  )
  const second = getGlobalObjLoaderCacheKey(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=c886ec2b42464573a88fc1f647577a49&pn=C5184526&cachebust_origin=http%3A%2F%2Flocalhost%3A3020",
  )

  expect(first).toBe(second)
  expect(first).not.toContain("cachebust_origin")
})

test("keeps meaningful model URL parameters in the OBJ cache key", () => {
  const first = getGlobalObjLoaderCacheKey(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=c886ec2b42464573a88fc1f647577a49&pn=C5184526&cachebust_origin=https%3A%2F%2Ftscircuit.com",
  )
  const second = getGlobalObjLoaderCacheKey(
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=c00f29e7afb64c29bc388e168980ded2&pn=C400227&cachebust_origin=https%3A%2F%2Ftscircuit.com",
  )

  expect(first).not.toBe(second)
  expect(first).toContain("uuid=c886ec2b42464573a88fc1f647577a49")
  expect(first).toContain("pn=C5184526")
})

test("normalizes relative OBJ cache keys without making them origin-specific", () => {
  expect(
    getGlobalObjLoaderCacheKey(
      "/easyeda-models/chip.obj?uuid=abc&cachebust_origin=http%3A%2F%2Flocalhost%3A3020",
    ),
  ).toBe("/easyeda-models/chip.obj?uuid=abc")
})
