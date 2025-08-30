export function removeExistingCanvases(container: HTMLElement) {
  container
    .querySelectorAll("canvas")
    .forEach((existingCanvas) => existingCanvas.remove())
}
