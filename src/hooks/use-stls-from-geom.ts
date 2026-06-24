import { useState, useEffect } from "react"
import stlSerializer from "@jscad/stl-serializer"
import { Geom3 } from "@jscad/modeling/src/geometries/types"

export type LayerType =
  | "board"
  | "top-copper"
  | "bottom-copper"
  | "top-silkscreen"
  | "bottom-silkscreen"

type StlObj = {
  stlData: ArrayBuffer
  color: number[]
  layerType?: LayerType
}

export const useStlsFromGeom = (
  geom: Geom3[] | Geom3 | null,
): {
  stls: StlObj[]
  loading: boolean
} => {
  const [stls, setStls] = useState<StlObj[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!geom) return
    const generateStls = async () => {
      setLoading(true)
      const geometries = Array.isArray(geom) ? geom : [geom]

      const stlPromises = geometries.map(async (g, index) => {
        const rawParts = stlSerializer.serialize({ binary: true }, [g])
        // Serialize to a Blob then get a single ArrayBuffer for direct parsing
        const blob = new Blob(rawParts)
        const stlData = await blob.arrayBuffer()

        // Extract layerType from geometry metadata if available
        const layerType = (g as any).layerType as LayerType | undefined

        // Fallback: infer from index if layerType not set
        // Index 0 is typically the board body
        const inferredLayerType: LayerType | undefined =
          layerType || (index === 0 ? "board" : undefined)

        return { stlData, color: g.color!, layerType: inferredLayerType }
      })

      try {
        const generatedStls = await Promise.all(stlPromises)
        setStls(generatedStls)
      } catch (error) {
        console.error("Error generating STLs:", error)
        setStls([])
      } finally {
        setLoading(false)
      }
    }

    generateStls()
  }, [geom])

  return { stls, loading }
}
