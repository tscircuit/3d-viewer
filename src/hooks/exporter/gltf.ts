import type * as React from "react"
import type * as THREE from "three"
import { GLTFExporter, type GLTFExporterOptions } from "three-stdlib"
import { useEffect, useState, useMemo, useCallback } from "react"

type Options = Omit<
  GLTFExporterOptions,
  "animations" | "includeCustomExtensions"
>

export function useSaveGltfAs(
  options = {} as Options & { filename?: string },
): [
  ref3D: React.ForwardedRef<THREE.Object3D>,
  saveAs: (filename?: string) => Promise<void>,
] {
  const parse = useParser(options)
  const link = useMemo(() => document.createElement("a"), [])
  const saveAs = async (filename?: string) => {
    const name = filename ?? options.filename ?? ""
    if (options.binary == null) options.binary = name.endsWith(".glb")
    const url = await parse(instance!)
    link.download = name
    link.href = url
    link.dispatchEvent(new MouseEvent("click"))
    URL.revokeObjectURL(url)
  }

  useEffect(
    () => () => {
      link.remove()
      instance = null
    },
    [],
  )

  let instance: THREE.Object3D | null
  const ref = useCallback((obj3D: THREE.Object3D | null) => {
    instance = obj3D!
  }, [])

  return [ref, saveAs]
}

export function useExportGltfUrl(
  options = {} as Options,
): [
  ref3D: React.ForwardedRef<THREE.Object3D>,
  url: string | undefined,
  error: ErrorEvent | undefined,
] {
  const parse = useParser(options)
  const [url, setUrl] = useState<string>()
  const [error, setError] = useState<ErrorEvent>()
  const ref = useCallback(
    (instance: THREE.Object3D | null) =>
      parse(instance!).then(setUrl).catch(setError),
    [],
  )
  useEffect(() => () => URL.revokeObjectURL(url!), [url])
  return [ref, url, error]
}

function useParser(options = {} as Options) {
  const exporter = useMemo(() => new GLTFExporter(), [])
  return (instance: THREE.Object3D) => {
    const { promise, resolve, reject } = Promise.withResolvers<string>()
    exporter.parse(
      instance,
      (gltf) => {
        const type = options.binary ? "gltf-binary" : "gltf+json"
        const blob = new Blob(
          [gltf instanceof ArrayBuffer ? gltf : JSON.stringify(gltf)],
          { type: `model/${type}` },
        )
        resolve(URL.createObjectURL(blob))
      },
      reject,
      options,
    )
    return promise
  }
}
