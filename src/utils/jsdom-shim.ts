import type { JSDOM } from "jsdom"
import { ResizeObserver } from "@juggle/resize-observer"

export function applyJsdomShim(jsdom: JSDOM) {
  // Apply JSDOM globals needed for SvgRenderer
  global.window = jsdom.window as any
  global.document = jsdom.window.document
  global.window.ResizeObserver = ResizeObserver
}
