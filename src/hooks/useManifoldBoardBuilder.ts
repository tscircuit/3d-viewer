import { useState, useEffect, useMemo, useRef } from "react"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { su } from "@tscircuit/soup-util"
import * as THREE from "three"
import { manifoldMeshToThreeGeometry } from "../utils/manifold-mesh-to-three-geometry"

export interface ManifoldGeoms {
  board?: { geometry: THREE.BufferGeometry; color: THREE.Color }
  platedHoles?: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }>
  smtPads?: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }>
  vias?: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }>
}

export interface ManifoldTextures {
  topTrace?: THREE.CanvasTexture | null
  bottomTrace?: THREE.CanvasTexture | null
  topSilkscreen?: THREE.CanvasTexture | null
  bottomSilkscreen?: THREE.CanvasTexture | null
}

interface UseManifoldBoardBuilderResult {
  geoms: ManifoldGeoms | null
  textures: ManifoldTextures | null
  pcbThickness: number | null
  error: string | null
  isLoading: boolean
  boardData: PcbBoard | null
}

const MANIFOLD_CDN_BASE_URL = "https://cdn.jsdelivr.net/npm/manifold-3d@3.1.1"

export const useManifoldBoardBuilder = (
  circuitJson: AnyCircuitElement[] | undefined,
): UseManifoldBoardBuilderResult => {
  const [geoms, setGeoms] = useState<ManifoldGeoms | null>(null)
  const [textures, setTextures] = useState<ManifoldTextures | null>(null)
  const [pcbThickness, setPcbThickness] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [boardData, setBoardData] = useState<PcbBoard | null>(null)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    if (!circuitJson) {
      setGeoms(null)
      setTextures(null)
      setPcbThickness(null)
      setError(null)
      setIsLoading(false)
      setBoardData(null)
      return
    }

    const boards = su(circuitJson).pcb_board.list()
    if (boards.length === 0) {
      setError("No pcb_board found in circuitJson.")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setGeoms(null)
    setTextures(null)

    // Terminate existing worker if there is one
    if (workerRef.current) {
      workerRef.current.terminate()
    }

    const worker = new Worker(
      new URL("../workers/manifold-builder.worker.ts", import.meta.url),
      { type: "module" },
    )
    workerRef.current = worker

    worker.postMessage({
      circuitJson,
      manifoldPath: `${MANIFOLD_CDN_BASE_URL}/manifold.wasm`,
    })

    worker.onmessage = (event) => {
      const { type, payload, error: workerError, message } = event.data

      switch (type) {
        case "pcb_thickness":
          setPcbThickness(payload)
          break
        case "board_data":
          setBoardData(payload)
          break
        case "geom_update":
          setGeoms((prevGeoms) => {
            const newGeoms: ManifoldGeoms = { ...prevGeoms }
            if (payload.board) {
              newGeoms.board = {
                geometry: manifoldMeshToThreeGeometry(payload.board.mesh),
                color: new THREE.Color(...payload.board.color),
              }
            }
            const processGeomArray = (
              key: "platedHoles" | "smtPads" | "vias",
            ) => {
              if (payload[key]) {
                const geomArray = payload[key].map((item: any) => ({
                  key: item.key,
                  geometry: manifoldMeshToThreeGeometry(item.mesh),
                  color: new THREE.Color(...item.color),
                }))
                newGeoms[key] = [...(newGeoms[key] ?? []), ...geomArray]
              }
            }
            processGeomArray("platedHoles")
            processGeomArray("smtPads")
            processGeomArray("vias")
            return newGeoms
          })
          break
        case "texture_update":
          setTextures((prevTextures) => {
            const newTextures: ManifoldTextures = { ...prevTextures }
            for (const key in payload) {
              const imageBitmap = payload[key]
              const texture = new THREE.CanvasTexture(imageBitmap)
              texture.generateMipmaps = true
              texture.minFilter = THREE.LinearMipmapLinearFilter
              texture.magFilter = THREE.LinearFilter
              texture.anisotropy = 16
              texture.needsUpdate = true
              ;(newTextures as any)[key] = texture
            }
            return newTextures
          })
          break
        case "done":
          setIsLoading(false)
          break
        case "error":
          setError(workerError)
          setIsLoading(false)
          break
        case "log":
          console.time(message)
          break
        case "log_end":
          console.timeEnd(message)
          break
      }
    }

    worker.onerror = (err) => {
      setError(`Worker error: ${err.message}`)
      setIsLoading(false)
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [circuitJson])

  const derivedBoardData = useMemo(() => {
    if (!circuitJson) return null
    const boards = su(circuitJson).pcb_board.list()
    return boards[0] ?? null
  }, [circuitJson])

  return {
    geoms,
    textures,
    pcbThickness,
    error,
    isLoading,
    boardData: boardData ?? derivedBoardData,
  }
}
