import type * as React from "react"
import type * as THREE from "three"
import { GLTFExporter, type GLTFExporterOptions } from "three-stdlib"
import { useRef, useEffect, useState, useMemo } from "react"

type Options = Omit<
  GLTFExporterOptions,
  "animations" | "includeCustomExtensions"
>

export function useSaveGltfAs(
  filename?: string,
  options = {} as Options,
): [
  ref3D: React.Ref<THREE.Object3D>,
  saveAs: typeof filename extends string
    ? (name?: string) => void
    : (name: string) => void,
  error: ErrorEvent | undefined,
] {
  const [ref, url, error] = useExportGltfUrl(options)
  const link = useMemo(() => document.createElement("a"), [])
  const saveAs = (name?: string) => {
    link.download = name ?? filename!
    link.href = url!
    link.dispatchEvent(new MouseEvent("click"))
  }
  useEffect(() => () => link.remove(), [])
  return [ref, saveAs, error]
}

export function useExportGltfUrl(
  options = {} as Options,
): [
  ref3D: React.Ref<THREE.Object3D>,
  url: string | undefined,
  error: ErrorEvent | undefined,
] {
  const ref = useRef<THREE.Object3D>(null)
  const exporter = useMemo(() => new GLTFExporter(), [])
  const [url, setUrl] = useState<string>()
  const [error, setError] = useState<ErrorEvent>()
  useEffect(() => {
    exporter.parse(
      ref.current!,
      (gltf) => {
        const type = options.binary ? "octet-stream" : "json"
        const blob = new Blob(
          [gltf instanceof ArrayBuffer ? gltf : JSON.stringify(gltf)],
          { type: `application/${type}` },
        )
        setUrl(URL.createObjectURL(blob))
      },
      setError,
      options,
    )
    return () => URL.revokeObjectURL(url!)
  }, [])
  return [ref, url, error]
}
