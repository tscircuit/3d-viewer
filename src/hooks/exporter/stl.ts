import type * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import type * as THREE from "three"
import { STLExporter, type STLExporterOptions } from "three-stdlib"

type Options = STLExporterOptions

export function useSaveStlAs(
  options = {} as Options & { filename?: string },
): [
  ref3D: React.ForwardedRef<THREE.Object3D>,
  saveAs: (filename?: string) => Promise<void>,
] {
  const parse = useStlParser(options)
  const link = useMemo(() => document.createElement("a"), [])
  const saveAs = async (filename?: string) => {
    const name = filename ?? options.filename ?? "pcb.stl"
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

export function useExportStlUrl(
  options = {} as Options,
): [
  ref3D: React.ForwardedRef<THREE.Object3D>,
  url: string | undefined,
  error: ErrorEvent | undefined,
] {
  const parse = useStlParser(options)
  const [url, setUrl] = useState<string>()
  const [error, setError] = useState<ErrorEvent>()
  const ref = useCallback((instance: THREE.Object3D | null) => {
    if (!instance) return
    parse(instance).then(setUrl).catch(setError)
  }, [])
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])
  return [ref, url, error]
}

function useStlParser(options = {} as Options) {
  const exporter = useMemo(() => new STLExporter(), [])
  return async (instance: THREE.Object3D) => {
    instance.updateMatrixWorld(true)
    let part: BlobPart
    if (options.binary) {
      const view = exporter.parse(instance, { binary: true })
      const copy = new Uint8Array(view.byteLength)
      copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))
      part = copy.buffer
    } else {
      part = exporter.parse(instance, { binary: false })
    }
    const blob = new Blob([part], { type: "model/stl" })
    return URL.createObjectURL(blob)
  }
}
