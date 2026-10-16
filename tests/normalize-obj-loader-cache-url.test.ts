import { expect, test } from "bun:test"
import { normalizeObjLoaderCacheUrl } from "../src/hooks/use-global-obj-loader"

test("removes cachebust_origin from remote EasyEDA model URLs", () => {
  const url =
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=c886ec2b42464573a88fc1f647577a49&pn=C5184526&cachebust_origin=https%3A%2F%2Ftscircuit.com"

  expect(normalizeObjLoaderCacheUrl(url)).toBe(
    "https://modelcdn.tscircuit.com/easyeda_models/download?pn=C5184526&uuid=c886ec2b42464573a88fc1f647577a49",
  )
})

test("normalizes cache-equivalent model URLs to the same key", () => {
  const first =
    "https://modelcdn.tscircuit.com/easyeda_models/download?uuid=abc&pn=C1&cachebust_origin=https%3A%2F%2Ftscircuit.com"
  const second =
    "https://modelcdn.tscircuit.com/easyeda_models/download?cachebust_origin=http%3A%2F%2Flocalhost%3A3020&pn=C1&uuid=abc"

  expect(normalizeObjLoaderCacheUrl(first)).toBe(
    normalizeObjLoaderCacheUrl(second),
  )
})

test("preserves relative model URLs without cachebust params", () => {
  expect(normalizeObjLoaderCacheUrl("/easyeda-models/part.obj")).toBe(
    "/easyeda-models/part.obj",
  )
})
