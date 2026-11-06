import { expect, spyOn, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"
import { useGlbModel } from "../src/hooks/useGlbModel"

test("replacing GLBs aborts pending requests, disposes old resources, and clears errors", async () => {
  const dom = new JSDOM('<div id="root"></div>')
  const previous = { window: globalThis.window, document: globalThis.document }
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  const signals: AbortSignal[] = []
  let finishRequest: ((response: Response) => void) | undefined
  const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(((
    _url: unknown,
    options: RequestInit,
  ) => {
    signals.push(options.signal as AbortSignal)
    return new Promise<Response>((resolve) => {
      finishRequest = resolve
    })
  }) as typeof fetch)
  const renderState: { current?: ReturnType<typeof useGlbModel> } = {}
  const states: Array<ReturnType<typeof useGlbModel>> = []
  const Harness = ({ source }: { source: string | ArrayBuffer }) => {
    const latest = useGlbModel(source)
    renderState.current = latest
    states.push(latest)
    return <div>{latest.error ?? (latest.isLoading ? "loading" : "ready")}</div>
  }
  const container = dom.window.document.getElementById("root")!
  const root = createRoot(container)
  const bytes = await Bun.file(
    new URL("./assets/prerendered-components.glb", import.meta.url),
  ).arrayBuffer()
  try {
    await act(async () => {
      root.render(<Harness source="/pending.glb" />)
    })
    expect(container.textContent).toBe("loading")
    await act(async () => {
      root.render(<Harness source={bytes} />)
    })
    expect(signals[0]!.aborted).toBe(true)
    expect(container.textContent).toBe("ready")
    const firstModel = renderState.current!.model!
    const mesh = firstModel.getObjectByProperty("type", "Mesh") as THREE.Mesh
    const disposed = spyOn(mesh.geometry, "dispose")
    // Keep A displayed after a failed replacement and while loading A again.
    await act(async () => {
      root.render(<Harness source={new ArrayBuffer(10)} />)
    })
    expect(disposed).not.toHaveBeenCalled()
    expect(renderState.current?.model).toBe(firstModel)
    expect(renderState.current?.error).toBeDefined()
    states.length = 0
    await act(async () => {
      root.render(<Harness source={bytes} />)
    })
    expect(states[0]).toEqual({
      model: firstModel,
      isLoading: true,
      error: undefined,
    })
    expect(disposed).toHaveBeenCalledTimes(1)
    expect(container.textContent).toBe("ready")
    expect(renderState.current!.model).not.toBe(firstModel)
    const replacement = renderState.current!.model!
    // A stale network response must not replace the current scene.
    await act(async () => {
      finishRequest!(new Response(bytes))
    })
    expect(renderState.current!.model).toBe(replacement)
    const replacementMesh = replacement.getObjectByProperty(
      "type",
      "Mesh",
    ) as THREE.Mesh
    const finalDispose = spyOn(replacementMesh.geometry, "dispose")
    await act(async () => {
      root.unmount()
    })
    expect(finalDispose).toHaveBeenCalledTimes(1)
  } finally {
    await act(async () => {
      root.unmount()
    })
    fetchSpy.mockRestore()
    Object.assign(globalThis, previous)
    dom.window.close()
  }
})
