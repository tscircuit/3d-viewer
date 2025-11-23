import { useEffect, useMemo, useRef, useState } from "react"

export type HotkeyMetadata = {
  shortcut: string
  description: string
}

type HotkeyRegistration = HotkeyMetadata & {
  id: string
  invoke: () => void
}

type HotkeySubscriber = (entries: HotkeyRegistration[]) => void

const hotkeyRegistry = new Map<string, HotkeyRegistration>()
const subscribers = new Set<HotkeySubscriber>()

let isListenerAttached = false
let lastMouseX = 0
let lastMouseY = 0
let viewerElement: HTMLElement | null = null
let mouseTrackingAttached = false

const MAX_PARENT_DEPTH = 20 // Reasonable limit for DOM traversal; real-world nesting is typically 3-5 levels

const parseShortcut = (shortcut: string) => {
  const parts = shortcut.toLowerCase().split("+")
  const key = parts[parts.length - 1]
  const modifierParts = parts.slice(0, -1)

  return {
    key,
    ctrl: modifierParts.includes("ctrl"),
    cmd: modifierParts.includes("cmd"),
    shift: modifierParts.includes("shift"),
    alt: modifierParts.includes("alt"),
  }
}

const matchesShortcut = (event: KeyboardEvent, shortcut: string) => {
  const parsed = parseShortcut(shortcut)

  const keyMatches = event.key.toLowerCase() === parsed.key
  const ctrlMatches = parsed.ctrl === event.ctrlKey
  const cmdMatches = parsed.cmd === event.metaKey
  const shiftMatches = parsed.shift === event.shiftKey
  const altMatches = parsed.alt === event.altKey

  return keyMatches && ctrlMatches && cmdMatches && shiftMatches && altMatches
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!target || typeof target !== "object") return false
  const element = target as HTMLElement
  const tagName = element.tagName
  const editableTags = ["INPUT", "TEXTAREA", "SELECT"]
  if (editableTags.includes(tagName)) {
    return true
  }

  // Check contenteditable attribute - only true/"" means editable, not "false"
  const contentEditable = element.getAttribute?.("contenteditable")
  if (contentEditable === "true" || contentEditable === "") {
    return true
  }

  // Check for any parent elements that are editable
  let current = element.parentElement
  for (let depth = 0; depth < MAX_PARENT_DEPTH && current; depth++) {
    const tagName = current.tagName
    if (editableTags.includes(tagName)) {
      return true
    }

    const contentEditable = current.getAttribute?.("contenteditable")
    if (contentEditable === "true" || contentEditable === "") {
      return true
    }

    current = current.parentElement
  }

  return false
}

const isInputFocused = () => {
  if (typeof document === "undefined") return false
  const activeElement = document.activeElement
  if (!activeElement) return false

  const tagName = activeElement.tagName
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true
  }

  const contentEditable = activeElement.getAttribute("contenteditable")
  return contentEditable === "true" || contentEditable === ""
}

const isMouseOverViewer = () => {
  // If no viewer is registered, allow hotkeys globally (backward compatible)
  if (!viewerElement) return true

  const rect = viewerElement.getBoundingClientRect()
  return (
    lastMouseX >= rect.left &&
    lastMouseX <= rect.right &&
    lastMouseY >= rect.top &&
    lastMouseY <= rect.bottom
  )
}

const attachMouseTracking = () => {
  if (mouseTrackingAttached || typeof window === "undefined") return

  window.addEventListener("mousemove", (e) => {
    lastMouseX = e.clientX
    lastMouseY = e.clientY
  })

  mouseTrackingAttached = true
}

const handleKeydown = (event: KeyboardEvent) => {
  // Check if user is typing in an editable element
  if (isEditableTarget(event.target) || isInputFocused()) {
    return
  }

  // Only trigger hotkeys if mouse is over viewer (if registered)
  if (viewerElement && !isMouseOverViewer()) {
    return
  }

  hotkeyRegistry.forEach((entry) => {
    if (matchesShortcut(event, entry.shortcut)) {
      event.preventDefault()
      entry.invoke()
    }
  })
}

const notifySubscribers = () => {
  const entries = Array.from(hotkeyRegistry.values())
  subscribers.forEach((subscriber) => subscriber(entries))
}

const ensureListener = () => {
  if (isListenerAttached) return
  if (typeof window === "undefined") return
  window.addEventListener("keydown", handleKeydown)
  isListenerAttached = true
}

const registerHotkey = (registration: HotkeyRegistration) => {
  hotkeyRegistry.set(registration.id, registration)
  notifySubscribers()
  ensureListener()
}

const unregisterHotkey = (id: string) => {
  if (hotkeyRegistry.delete(id)) {
    notifySubscribers()
  }
}

const subscribeToRegistry = (subscriber: HotkeySubscriber) => {
  subscribers.add(subscriber)
  subscriber(Array.from(hotkeyRegistry.values()))
  return () => {
    subscribers.delete(subscriber)
  }
}

export const useRegisteredHotkey = (
  id: string,
  handler: () => void,
  metadata: HotkeyMetadata,
) => {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  const normalizedMetadata = useMemo(
    () => ({
      shortcut: metadata.shortcut,
      description: metadata.description,
    }),
    [metadata.shortcut, metadata.description],
  )

  useEffect(() => {
    const registration: HotkeyRegistration = {
      id,
      ...normalizedMetadata,
      invoke: () => handlerRef.current(),
    }

    registerHotkey(registration)

    return () => {
      unregisterHotkey(id)
    }
  }, [id, normalizedMetadata])
}

export const useHotkeyRegistry = () => {
  const [entries, setEntries] = useState<HotkeyRegistration[]>(() =>
    Array.from(hotkeyRegistry.values()),
  )

  useEffect(() => subscribeToRegistry(setEntries), [])

  return entries
}

/**
 * Register a viewer element for hotkey bounds checking
 * Only hotkeys triggered while mouse is over this element will be executed
 */
export const registerHotkeyViewer = (element: HTMLElement) => {
  viewerElement = element
  attachMouseTracking()
}

export type RegisteredHotkey = Omit<HotkeyRegistration, "invoke">
