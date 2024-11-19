import { useState, useEffect } from "react"
import stlSerializer from "@jscad/stl-serializer"
import { Geom3 } from "@jscad/modeling/src/geometries/types"

function blobToBase64Url(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

type StlObj = { stlUrl: string; color: number[] }

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
        const rawData = stlSerializer.serialize({ binary: true }, [g])
        const blobData = new Blob(rawData)
        const stlUrl = await blobToBase64Url(blobData)
        return { stlUrl, color: g.color! }
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
