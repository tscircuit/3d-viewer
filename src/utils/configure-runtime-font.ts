import { configureTextBuilder } from "troika-three-text"
import { getRuntimeAssetUrl } from "./get-runtime-asset-url"

let configured = false

export function configureRuntimeFont() {
  if (
    configured ||
    typeof window === "undefined" ||
    !window.TSCIRCUIT_JSCDN_BASE_URL
  )
    return
  configureTextBuilder({
    defaultFontURL: getRuntimeAssetUrl(
      "three",
      "0.165.0",
      "examples/fonts/ttf/kenpixel.ttf",
    ),
    unicodeFontsURL: getRuntimeAssetUrl(
      "troika-three-text",
      "0.52.5",
      "unicode-fonts/",
    ),
  })
  configured = true
}
