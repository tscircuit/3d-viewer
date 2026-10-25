import { test } from "bun:test"
import { expectDrillTransparency } from "./fixtures/polygon-pad-rotation"

test.failing("37° shared surface textures expose every drill with soldermask=true", () =>
  expectDrillTransparency(37, true))
