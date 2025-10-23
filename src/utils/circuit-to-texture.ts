import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import * as THREE from "three"

// Dynamic import for resvg-wasm to avoid bundling issues
let Resvg: any = null
let resvgLoaded = false
let resvgLoading = false

async function loadResvg(): Promise<any> {
    if (resvgLoaded) return Resvg
    resvgLoading = true
    try {
        const resvgModule = await import("resvg-wasm")
        Resvg = resvgModule.Resvg
        resvgLoaded = true
        return Resvg
    } catch (error) {
        console.warn('Failed to load resvg-wasm:', error)
        return null
    } finally {
        resvgLoading = false
    }
}

export interface CircuitToTextureOptions {
    width?: number
    height?: number
    backgroundColor?: string
    padding?: number
    zoom?: number
    quality?: 'low' | 'medium' | 'high'
    layers?: {
        copper?: boolean
        silkscreen?: boolean
        solderMask?: boolean
        drillHoles?: boolean
    }
}

const DEFAULT_OPTIONS: Required<CircuitToTextureOptions> = {
    width: 1024,
    height: 1024,
    backgroundColor: "#ffffff",
    padding: 20,
    zoom: 1.0,
    quality: 'high',
    layers: {
        copper: true,
        silkscreen: true,
        solderMask: true,
        drillHoles: true,
    },
}

// Quality presets for different use cases
const QUALITY_PRESETS = {
    low: { width: 512, height: 512, zoom: 0.5 },
    medium: { width: 1024, height: 1024, zoom: 1.0 },
    high: { width: 2048, height: 2048, zoom: 1.5 },
} as const

/**
 * Converts circuit JSON to PNG texture using circuit-to-svg and resvg-wasm
 */
export async function convertCircuitToTexture(
    circuitJson: AnyCircuitElement[],
    options: CircuitToTextureOptions = {}
): Promise<Uint8Array> {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    // Apply quality preset if specified
    if (opts.quality && opts.quality !== 'high') {
        const preset = QUALITY_PRESETS[opts.quality]
        opts.width = preset.width
        opts.height = preset.height
        opts.zoom = preset.zoom
    }

    try {
        // Convert circuit JSON to SVG using circuit-to-svg
        const svgString = await convertCircuitJsonToPcbSvg(circuitJson, {
            width: opts.width,
            height: opts.height,
            backgroundColor: opts.backgroundColor,
            zoom: opts.zoom,
            layers: opts.layers,
        })

        // Validate SVG string
        if (!svgString || svgString.trim().length === 0) {
            throw new Error('Empty SVG generated from circuit JSON')
        }

        // Try to load resvg-wasm dynamically
        const ResvgClass = await loadResvg()
        if (!ResvgClass) {
            console.warn('resvg-wasm not available, falling back to canvas texture')
            return createCanvasTexture(svgString, opts.width, opts.height, opts.backgroundColor)
        }

        // Convert SVG to PNG using resvg-wasm with optimized settings
        const resvg = new ResvgClass(svgString, {
            background: opts.backgroundColor,
            fitTo: {
                mode: 'width',
                value: opts.width,
            },
            font: {
                loadSystemFonts: false, // Disable system fonts for better performance
            },
        })

        const pngData = resvg.render()
        const pngBuffer = pngData.asPng()

        // Validate PNG data
        if (!pngBuffer || pngBuffer.length === 0) {
            throw new Error('Empty PNG generated from SVG')
        }

        return new Uint8Array(pngBuffer)
    } catch (error) {
        console.error('Error converting circuit to texture:', error)
        // Fallback to canvas texture if resvg-wasm fails
        try {
            const svgString = await convertCircuitJsonToPcbSvg(circuitJson, {
                width: opts.width,
                height: opts.height,
                backgroundColor: opts.backgroundColor,
                zoom: opts.zoom,
                layers: opts.layers,
            })
            return createCanvasTexture(svgString, opts.width, opts.height, opts.backgroundColor)
        } catch (fallbackError) {
            throw new Error(`Failed to convert circuit to texture: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
}

// Fallback texture generation using Canvas API
function createCanvasTexture(svgString: string, width: number, height: number, backgroundColor: string): Uint8Array {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    if (!ctx) {
        throw new Error('Failed to get canvas 2D context')
    }

    // Fill background
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)

    // Create a more realistic PCB pattern
    createPCBPattern(ctx, width, height)

    // Convert canvas to PNG data
    const dataURL = canvas.toDataURL('image/png')
    const base64 = dataURL.split(',')[1]
    if (!base64) {
        throw new Error('Failed to generate canvas data URL')
    }

    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }

    return bytes
}

// Create a more realistic PCB pattern
function createPCBPattern(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // PCB substrate (dark green)
    ctx.fillStyle = '#2d5016'
    ctx.fillRect(0, 0, width, height)

    // Copper traces pattern
    ctx.fillStyle = '#b87333'
    ctx.lineWidth = 2

    // Horizontal traces
    for (let y = 20; y < height; y += 40) {
        ctx.beginPath()
        ctx.moveTo(20, y)
        ctx.lineTo(width - 20, y)
        ctx.stroke()
    }

    // Vertical traces
    for (let x = 20; x < width; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 20)
        ctx.lineTo(x, height - 20)
        ctx.stroke()
    }

    // Add some pads
    ctx.fillStyle = '#c9a96e' // Gold color for pads
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * (width - 40) + 20
        const y = Math.random() * (height - 40) + 20
        const size = Math.random() * 8 + 4

        ctx.beginPath()
        ctx.arc(x, y, size, 0, 2 * Math.PI)
        ctx.fill()
    }

    // Add some vias
    ctx.fillStyle = '#8b4513' // Brown for vias
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * (width - 20) + 10
        const y = Math.random() * (height - 20) + 10

        ctx.beginPath()
        ctx.arc(x, y, 2, 0, 2 * Math.PI)
        ctx.fill()
    }
}

/**
 * Creates a Three.js texture from circuit JSON
 */
export async function createCircuitTexture(
    circuitJson: AnyCircuitElement[],
    options: CircuitToTextureOptions = {}
): Promise<THREE.Texture> {
    const pngData = await convertCircuitToTexture(circuitJson, options)

    // Create a blob URL from the PNG data
    const blob = new Blob([pngData.buffer], { type: 'image/png' })
    const url = URL.createObjectURL(blob)

    // Create Three.js texture with optimized settings
    const texture = new THREE.TextureLoader().load(url)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.flipY = false // SVG coordinates are already correct
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter

    // Clean up the blob URL after texture is loaded
    texture.addEventListener('load', () => {
        URL.revokeObjectURL(url)
    })

    return texture
}

/**
 * Creates a texture for the top side of the PCB
 */
export async function createTopSideTexture(
    circuitJson: AnyCircuitElement[],
    options: CircuitToTextureOptions = {}
): Promise<THREE.Texture> {
    return createCircuitTexture(circuitJson, {
        ...options,
        layers: {
            copper: true,
            silkscreen: true,
            solderMask: true,
            drillHoles: false, // Don't show drill holes on top texture
        },
    })
}

/**
 * Creates a texture for the bottom side of the PCB
 */
export async function createBottomSideTexture(
    circuitJson: AnyCircuitElement[],
    options: CircuitToTextureOptions = {}
): Promise<THREE.Texture> {
    return createCircuitTexture(circuitJson, {
        ...options,
        layers: {
            copper: true,
            silkscreen: true,
            solderMask: true,
            drillHoles: false, // Don't show drill holes on bottom texture
        },
    })
}

/**
 * Creates a texture cache to avoid regenerating the same textures
 */
class TextureCache {
    private cache = new Map<string, THREE.Texture>()
    private maxSize = 50

    private generateKey(circuitJson: AnyCircuitElement[], options: CircuitToTextureOptions): string {
        return JSON.stringify({ circuitJson, options })
    }

    get(circuitJson: AnyCircuitElement[], options: CircuitToTextureOptions): THREE.Texture | null {
        const key = this.generateKey(circuitJson, options)
        return this.cache.get(key) || null
    }

    set(circuitJson: AnyCircuitElement[], options: CircuitToTextureOptions, texture: THREE.Texture): void {
        const key = this.generateKey(circuitJson, options)

        // Implement LRU eviction if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value
            if (firstKey) {
                this.cache.delete(firstKey)
            }
        }

        this.cache.set(key, texture)
    }

    clear(): void {
        this.cache.clear()
    }
}

// Global texture cache instance
const textureCache = new TextureCache()

/**
 * Creates a cached texture to avoid regenerating the same textures
 */
export async function createCachedCircuitTexture(
    circuitJson: AnyCircuitElement[],
    options: CircuitToTextureOptions = {}
): Promise<THREE.Texture> {
    // Check cache first
    const cached = textureCache.get(circuitJson, options)
    if (cached) {
        return cached
    }

    // Generate new texture
    const texture = await createCircuitTexture(circuitJson, options)

    // Cache the texture
    textureCache.set(circuitJson, options, texture)

    return texture
}
