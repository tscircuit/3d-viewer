import { useEffect, useMemo, useRef, useState } from "react"

export type HotkeyMetadata = {
  key: string
  description: string
  modifiers?: ("Ctrl" | "Cmd" | "Shift" | "Alt")[]
}

type HotkeyRegistration = HotkeyMetadata & {
  id: string
  invoke: () => void
}

type HotkeySubscriber = (entries: HotkeyRegistration[]) => void

const hotkeyRegistry = new Map<string, HotkeyRegistration>()
const subscribers = new Set<HotkeySubscriber>()

let isListenerAttached = false

const MAX_PARENT_DEPTH = 20 // Reasonable limit for DOM traversal; real-world nesting is typically 3-5 levels

const matchesKey = (eventKey: string, targetKey: string) => {
  if (!eventKey || !targetKey) return false
  return eventKey.toLowerCase() === targetKey.toLowerCase()
}

const matchesModifiers = (
  event: KeyboardEvent,
  modifiers?: ("Ctrl" | "Cmd" | "Shift" | "Alt")[],
) => {
  const lowerModifiers = modifiers?.map((m) => m.toLowerCase()) ?? []
  const hasCtrl = lowerModifiers.includes("ctrl")
  const hasCmd = lowerModifiers.includes("cmd")
  const hasShift = lowerModifiers.includes("shift")
  const hasAlt = lowerModifiers.includes("alt")

  return (
    hasCtrl === event.ctrlKey &&
    hasCmd === event.metaKey &&
    hasShift === event.shiftKey &&
    hasAlt === event.altKey
  )
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

const handleKeydown = (event: KeyboardEvent) => {
  if (isEditableTarget(event.target)) {
    return
  }

  hotkeyRegistry.forEach((entry) => {
    if (
      matchesKey(event.key, entry.key) &&
      matchesModifiers(event, entry.modifiers)
    ) {
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
      key: metadata.key,
      description: metadata.description,
      modifiers: metadata.modifiers,
    }),
    [metadata.key, metadata.description, metadata.modifiers],
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

export type RegisteredHotkey = Omit<HotkeyRegistration, "invoke">
