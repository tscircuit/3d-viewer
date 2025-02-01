import type { JSDOM } from "jsdom"

export function applyJsdomShim(jsdom: JSDOM) {
  // Apply JSDOM globals needed for SvgRenderer
  global.window = jsdom.window as any
  global.document = jsdom.window.document
}
