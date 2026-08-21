import { expect, test } from "bun:test"
import * as jscadModeling from "@jscad/modeling"
import { getJscadModelForFootprint } from "jscad-electronics/vanilla"
import { JSDOM } from "jsdom"
import { act } from "react"
import { createRoot } from "react-dom/client"
import * as THREE from "three"

const { FootprinterModel } = await import(
  "../src/three-components/FootprinterModel"
)
const { ThreeErrorBoundary } = await import(
  "../src/three-components/ThreeErrorBoundary"
)
const { ThreeContext } = await import("../src/react-three/ThreeContext")
const { HoverContext } = await import("../src/react-three/HoverContext")

/** A footprint jscad-electronics has no body for. */
const FOOTPRINT_WITH_NO_MODEL = "res_p0.8656mm_pw0.5657mm_ph0.54mm"

/**
 * Half of what makes the viewer-side change necessary is upstream silence, so
 * it is asserted rather than assumed: if jscad-electronics ever starts throwing
 * for this, or starts returning a body, this test says so instead of leaving a
 * guard in place for a condition that no longer occurs.
 */
test("jscad-electronics reports a missing body as an empty model, not an error", () => {
  const { geometries } = getJscadModelForFootprint(
    FOOTPRINT_WITH_NO_MODEL,
    jscadModeling as any,
  )

  expect(geometries.flat(Number.POSITIVE_INFINITY)).toHaveLength(0)
})

/**
 * Renders one `FootprinterModel` inside the same error boundary the viewers
 * wrap every model in, and reports what the boundary caught and what reached
 * the scene. Measured before unmount, since unmounting detaches the group.
 */
const renderInBoundary = async (footprint: string) => {
  const dom = new JSDOM('<div id="root"></div>')
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })

  let caughtError: Error | undefined
  const rootObject = new THREE.Object3D()
  const reactRoot = createRoot(dom.window.document.getElementById("root")!)
  let objectsInScene = 0

  try {
    await act(async () => {
      reactRoot.render(
        <ThreeContext.Provider value={{ rootObject } as any}>
          <HoverContext.Provider
            value={{ addHoverable: () => {}, removeHoverable: () => {} }}
          >
            <ThreeErrorBoundary
              fallback={({ error }) => {
                caughtError ??= error
                return null
              }}
            >
              <FootprinterModel
                footprint={footprint}
                positionOffset={[0, 0, 0]}
                rotationOffset={[0, 0, 0]}
                onHover={() => {}}
                onUnhover={() => {}}
                isHovered={false}
              />
            </ThreeErrorBoundary>
          </HoverContext.Provider>
        </ThreeContext.Provider>,
      )
    })
    objectsInScene = rootObject.children.length
  } finally {
    await act(async () => reactRoot.unmount())
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    dom.window.close()
  }

  return { caughtError, objectsInScene }
}

/**
 * An empty model used to build an empty `THREE.Group`: no geometry, no error,
 * no cube -- the component simply absent from the board, indistinguishable from
 * one that was never placed. That is how a board lost 26 of its 36 passives
 * with nothing to search for.
 *
 * Throwing during render is what puts it in front of this boundary, which the
 * viewers back with `Error3d`: the red cube, with the message on hover.
 */
test("a footprint with no body raises to the error boundary that draws the cube", async () => {
  const { caughtError, objectsInScene } = await renderInBoundary(
    FOOTPRINT_WITH_NO_MODEL,
  )

  expect(caughtError?.message).toContain("No 3D model for footprint")
  expect(caughtError?.message).toContain(FOOTPRINT_WITH_NO_MODEL)
  expect(objectsInScene).toBe(0)
})

test("a footprint that does have a body still renders it, and raises nothing", async () => {
  const { caughtError, objectsInScene } = await renderInBoundary("0603")

  expect(caughtError).toBeUndefined()
  expect(objectsInScene).toBeGreaterThan(0)
})
