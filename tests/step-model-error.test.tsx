import { expect, mock, test } from "bun:test"
import { JSDOM } from "jsdom"
import React, { act } from "react"
import { createRoot } from "react-dom/client"
import { StepModel } from "../src/three-components/StepModel"

class CaptureErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { error: Error | null }
> {
  override state = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  override componentDidCatch(error: Error) {
    this.props.onError(error)
  }

  override render() {
    return this.state.error ? null : this.props.children
  }
}

const waitForEffects = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0)
  })

test("StepModel surfaces STEP conversion failures to error boundaries", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://example.test/",
  })
  const container = dom.window.document.getElementById("root")
  if (!container) {
    throw new Error("Missing test root")
  }

  const originalWindow = globalThis.window
  const originalDocument = globalThis.document
  const originalLocalStorage = globalThis.localStorage
  const originalFetch = globalThis.fetch
  const originalConsoleError = console.error

  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  ;(globalThis as any).window = dom.window
  ;(globalThis as any).document = dom.window.document
  ;(globalThis as any).localStorage = dom.window.localStorage
  globalThis.fetch = mock(async () => {
    return new Response("", { status: 404, statusText: "Not Found" })
  }) as typeof fetch
  console.error = mock(() => {}) as typeof console.error

  let capturedError: Error | null = null
  const root = createRoot(container)

  try {
    await act(async () => {
      root.render(
        <CaptureErrorBoundary
          onError={(error) => {
            capturedError = error
          }}
        >
          <StepModel
            stepUrl="https://example.test/missing.step"
            onHover={() => {}}
            onUnhover={() => {}}
            isHovered={false}
          />
        </CaptureErrorBoundary>,
      )
    })

    for (let i = 0; i < 20 && !capturedError; i += 1) {
      await act(async () => {
        await waitForEffects()
      })
    }

    const error = capturedError as Error | null
    expect(error?.message).toBe("Failed to fetch STEP file: Not Found")
  } finally {
    await act(async () => {
      root.unmount()
    })
    ;(globalThis as any).window = originalWindow
    ;(globalThis as any).document = originalDocument
    ;(globalThis as any).localStorage = originalLocalStorage
    globalThis.fetch = originalFetch
    console.error = originalConsoleError
    delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT
  }
})
