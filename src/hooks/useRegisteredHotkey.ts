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
  return Boolean(element.getAttribute?.("contenteditable"))
}

const handleKeydown = (event: KeyboardEvent) => {
  if (isEditableTarget(event.target)) {
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

export type RegisteredHotkey = Omit<HotkeyRegistration, "invoke">
