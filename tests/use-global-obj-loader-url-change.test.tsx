import { afterEach, expect, test } from "bun:test"
import { JSDOM } from "jsdom"
import { act, useEffect } from "react"
import { createRoot, type Root } from "react-dom/client"

type DeferredResponse = {
  promise: Promise<Response>
  resolve: (response: Response) => void
}

const createDeferredResponse = (): DeferredResponse => {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const createObjResponse = () =>
  new Response("o cached_model\nv 0 0 0\n", {
    status: 200,
    statusText: "OK",
  })

let root: Root | null = null
const originalFetch = globalThis.fetch
const originalWindow = globalThis.window
const originalDocument = globalThis.document
const originalActEnvironment = (
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount()
    })
    root = null
  }
  globalThis.fetch = originalFetch
  globalThis.window = originalWindow
  globalThis.document = originalDocument
  const globalWithAct = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean
  }
  if (originalActEnvironment === undefined) {
    delete globalWithAct.IS_REACT_ACT_ENVIRONMENT
  } else {
    globalWithAct.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment
  }
})

test("useGlobalObjLoader clears stale object while a new url is loading", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://example.com",
  })
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  ;(
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true
  window.TSCIRCUIT_OBJ_LOADER_CACHE = new Map()

  const firstLoad = createDeferredResponse()
  const secondLoad = createDeferredResponse()
  const fetchCalls: string[] = []
  globalThis.fetch = (input) => {
    const url = input.toString()
    fetchCalls.push(url)
    if (url.endsWith("first.obj")) return firstLoad.promise
    if (url.endsWith("second.obj")) return secondLoad.promise
    throw new Error(`Unexpected fetch: ${url}`)
  }

  const { useGlobalObjLoader } = await import(
    "../src/hooks/use-global-obj-loader"
  )
  const observedStates: Array<"object" | "null" | "error"> = []

  function Probe({ url }: { url: string }) {
    const obj = useGlobalObjLoader(url)
    useEffect(() => {
      observedStates.push(
        obj instanceof Error ? "error" : obj === null ? "null" : "object",
      )
    }, [obj])
    return null
  }

  const container = dom.window.document.getElementById("root")
  if (!container) throw new Error("missing test root")
  root = createRoot(container)

  await act(async () => {
    root?.render(<Probe url="https://cdn.example.com/first.obj" />)
  })
  expect(observedStates).toEqual(["null"])

  await act(async () => {
    firstLoad.resolve(createObjResponse())
    await firstLoad.promise
  })
  expect(observedStates.at(-1)).toBe("object")

  await act(async () => {
    root?.render(<Probe url="https://cdn.example.com/second.obj" />)
  })
  expect(observedStates.at(-1)).toBe("null")

  await act(async () => {
    secondLoad.resolve(createObjResponse())
    await secondLoad.promise
  })
  expect(observedStates.at(-1)).toBe("object")
  expect(fetchCalls).toEqual([
    "https://cdn.example.com/first.obj",
    "https://cdn.example.com/second.obj",
  ])
})
