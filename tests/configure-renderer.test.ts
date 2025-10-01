import { expect, test } from "bun:test"
import * as THREE from "three"

import { configureRenderer } from "../src/react-three/configure-renderer"

test("configureRenderer enables sRGB output and ACES tone mapping", () => {
  const renderer = {
    outputColorSpace: THREE.LinearSRGBColorSpace,
    toneMapping: THREE.NoToneMapping,
    toneMappingExposure: 0.75,
  } as unknown as THREE.WebGLRenderer

  configureRenderer(renderer)

  expect(renderer.outputColorSpace).toBe(THREE.SRGBColorSpace)
  expect(renderer.toneMapping).toBe(THREE.ACESFilmicToneMapping)
  expect(renderer.toneMappingExposure).toBe(1)
})
