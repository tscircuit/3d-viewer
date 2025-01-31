import type { JSDOM } from "jsdom"

export function applyJsdomShim(jsdom: JSDOM) {
  // Apply JSDOM globals needed for THREE.js
  global.document = jsdom.window.document
  global.window = jsdom.window as any
  global.navigator = jsdom.window.navigator
  global.Element = jsdom.window.Element
  global.HTMLElement = jsdom.window.HTMLElement
}
