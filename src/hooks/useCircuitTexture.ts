import { useState, useEffect } from "react"
import * as THREE from "three"
import type { AnyCircuitElement } from "circuit-json"
import { createTopSideTexture } from "../utils/circuit-to-texture"

export function useCircuitTexture(
    circuitJson: AnyCircuitElement[] | undefined,
    enabled: boolean = true
): THREE.Texture | null {
    const [texture, setTexture] = useState<THREE.Texture | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!enabled || !circuitJson) {
            setTexture(null)
            return
        }

        setIsLoading(true)
        createTopSideTexture(circuitJson, {
            width: 1024,
            height: 1024,
            backgroundColor: "#ffffff",
        })
            .then((newTexture) => {
                setTexture(newTexture)
                setIsLoading(false)
            })
            .catch((error) => {
                console.warn('Failed to create circuit texture:', error)
                setTexture(null)
                setIsLoading(false)
            })
    }, [circuitJson, enabled])

    return texture
}
