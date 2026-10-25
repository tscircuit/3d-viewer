import { test } from "bun:test"
import { expectDrillTransparency } from "./fixtures/polygon-pad-rotation"

test.failing("0° shared surface textures expose every drill with soldermask=true", () =>
  expectDrillTransparency(0, true))
