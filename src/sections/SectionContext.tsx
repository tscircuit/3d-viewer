import { createContext, useContext, useState, type ReactNode } from "react"
import type { Box3 } from "three"
import type { SectionSpec } from "./section-geometry"

export interface SectionState {
  spec: SectionSpec | null
  editing: boolean
  bounds: Box3 | null
  alignRequest: number
  requestAlign: () => void
  openChains: number
  setSpec: (spec: SectionSpec | null) => void
  setEditing: (editing: boolean) => void
  setBounds: (bounds: Box3) => void
  setOpenChains: (count: number) => void
}
const SectionContext = createContext<SectionState | null>(null)
export const useSection = () => useContext(SectionContext)
export function SectionProvider({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<SectionSpec | null>(null)
  const [editing, setEditing] = useState(false)
  const [bounds, setBounds] = useState<Box3 | null>(null)
  const [alignRequest, setAlignRequest] = useState(0)
  const [openChains, setOpenChains] = useState(0)
  return (
    <SectionContext.Provider
      value={{
        alignRequest,
        requestAlign: () => setAlignRequest((n) => n + 1),
        spec,
        setSpec,
        editing,
        setEditing,
        bounds,
        setBounds,
        openChains,
        setOpenChains,
      }}
    >
      {children}
    </SectionContext.Provider>
  )
}
