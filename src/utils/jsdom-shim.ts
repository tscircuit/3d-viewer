import type { JSDOM } from "jsdom"

export function applyJsdomShim(jsdom: JSDOM) {
  // Apply JSDOM globals needed for SvgRenderer
  global.document = jsdom.window.document
}
