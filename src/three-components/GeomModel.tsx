import type { Geom3 } from "@jscad/modeling/src/geometries/types"

export const GeomModel = ({ geom }: { geom: Geom3[] | Geom3 }) => {
  if (!Array.isArray(geom)) {
    geom = [geom]
  }

  // TODO useGeomToStl

  // TODO STLModel

  return null
}
