import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import stlSerializer from "@jscad/stl-serializer"
import { join } from "../utils/buffer.ts"

export function geom2stl(geom: Geom3) {
  const rawData = stlSerializer.serialize({ binary: true }, [geom])
  return join(rawData)
}
