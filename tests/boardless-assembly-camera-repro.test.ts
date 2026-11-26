import { expect, test } from "bun:test"
import { getInitialCameraPosition } from "../src/utils/get-initial-camera-position"

// Characterizes the camera used by BoardlessAssemblyCamera.stories.tsx.
// The part is correctly sized in mm; the fallback camera is inside it.
test("reproduces boardless assembly camera starting inside a 38 mm part", () => {
  const [x, y, z] = getInitialCameraPosition({})
  expect(x > -19 && x < 19 && y > -18 && y < 18 && z > 0 && z < 12.8).toBe(true)
})
