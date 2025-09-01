import { useState, useEffect } from "react"
import stlSerializer from "@jscad/stl-serializer"
import { Geom3 } from "@jscad/modeling/src/geometries/types"

type StlObj = { stlData: ArrayBuffer; color: number[] }

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

      const stlPromises = geometries.map(async (g) => {
        const rawParts = stlSerializer.serialize({ binary: true }, [g])
        // Serialize to a Blob then get a single ArrayBuffer for direct parsing
        const blob = new Blob(rawParts)
        const stlData = await blob.arrayBuffer()
        return { stlData, color: g.color! }
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
