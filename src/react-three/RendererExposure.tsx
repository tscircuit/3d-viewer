import { type FC } from "react"
import { useRendererExposure } from "./useRendererExposure"

export interface RendererExposureProps {
  value: number | null | undefined
}

export const RendererExposure: FC<RendererExposureProps> = ({ value }) => {
  useRendererExposure(value)
  return null
}
