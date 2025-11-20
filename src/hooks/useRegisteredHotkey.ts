import { useEffect, useMemo, useRef, useState } from "react"

export type HotkeyMetadata = {
  key: string
  description: string
  modifiers?: string
}

type HotkeyRegistration = HotkeyMetadata & {
  id: string
  invoke: () => void
}

type HotkeySubscriber = (entries: HotkeyRegistration[]) => void

const hotkeyRegistry = new Map<string, HotkeyRegistration>()
const subscribers = new Set<HotkeySubscriber>()

let isListenerAttached = false

const matchesKey = (eventKey: string, targetKey: string) => {
  if (!eventKey || !targetKey) return false
  return eventKey.toLowerCase() === targetKey.toLowerCase()
}

const matchesModifiers = (event: KeyboardEvent, modifiers?: string) => {
  if (!modifiers) {
    return !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
  }

  const hasCtrl = modifiers.includes("Ctrl")
  const hasCmd = modifiers.includes("Cmd")
  const hasShift = modifiers.includes("Shift")
  const hasAlt = modifiers.includes("Alt")

  if (hasCtrl && !event.ctrlKey) return false
  if (hasCmd && !event.metaKey) return false
  if (hasShift && !event.shiftKey) return false
  if (hasAlt && !event.altKey) return false

  return true
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
