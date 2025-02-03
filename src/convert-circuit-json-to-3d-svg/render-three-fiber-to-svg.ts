import { createRoot } from "react-dom/client"

export const renderThreeFiberToSvg = async (
  threeCanvasElm: React.ReactNode,
): SVGElement => {
  const container = document.createElement("div")
  global.window.document.body.appendChild(container)

  const root = createRoot(container)

  root.render(threeCanvasElm)

  await new Promise((resolve) => {
    setTimeout(() => {
      resolve(container.outerHTML)
    }, 10000)
  })
  console.log(container.outerHTML)

  // return svg
}
