import { useState, useEffect } from "react"
import type { Object3D } from "three"
import { MTLLoader, OBJLoader } from "three-stdlib"
import { loadCachedModel } from "src/utils/model-cache"
import { loadVrml } from "src/utils/vrml"

export function useGlobalObjLoader(
  url: string | null,
): Object3D | null | Error {
  const [obj, setObj] = useState<Object3D | null | Error>(null)

  useEffect(() => {
    if (!url) return

    let hasUrlChanged = false

    async function loadAndParseObj(cleanUrl: string): Promise<Object3D> {
      if (cleanUrl.endsWith(".wrl")) {
        return await loadVrml(cleanUrl)
      }

      const response = await fetch(cleanUrl)
      if (!response.ok) {
        throw new Error(
          `Failed to fetch "${cleanUrl}": ${response.status} ${response.statusText}`,
        )
      }
      const text = await response.text()

      const mtlContentArr = text.match(/newmtl[\s\S]*?endmtl/g)

      const objLoader = new OBJLoader()

      if (mtlContentArr?.length) {
        const mtlContent = mtlContentArr.join("\n").replace(/d 0\./g, "d 1.")
        const objContent = text
          .replace(/newmtl[\s\S]*?endmtl/g, "")
          .replace(/^mtllib.*/gm, "")

        const mtlLoader = new MTLLoader()
        mtlLoader.setMaterialOptions({
          invertTrProperty: true,
        })
        const materials = mtlLoader.parse(
          mtlContent.replace(
            /Kd\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/g,
            "Kd $2 $2 $2",
          ),
          "embedded.mtl",
        )
        objLoader.setMaterials(materials)
        return objLoader.parse(objContent)
      }

      return objLoader.parse(text.replace(/^mtllib.*/gm, ""))
    }

    loadCachedModel(url, loadAndParseObj)
      .then((result) => {
        if (hasUrlChanged) return
        setObj(result)
      })
      .catch((error) => {
        console.error(error)
        if (!hasUrlChanged) {
          setObj(error instanceof Error ? error : new Error(String(error)))
        }
      })

    return () => {
      hasUrlChanged = true
    }
  }, [url])

  return obj
}
