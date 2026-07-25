"use client"

import * as React from "react"

const ANNOUNCEMENT_REMOVE_DELAY = 8000

interface Announcement {
  id: string
  message: string
  priority: "polite" | "assertive"
}

interface State {
  announcements: Announcement[]
}

type Action =
  | { type: "ADD_ANNOUNCEMENT"; announcement: Announcement }
  | { type: "REMOVE_ANNOUNCEMENT"; announcementId: string }

let count = 0
function genId(): string {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const announcementTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

function addToRemoveQueue(announcementId: string) {
  if (announcementTimeouts.has(announcementId)) return
  const timeout = setTimeout(() => {
    announcementTimeouts.delete(announcementId)
    dispatch({ type: "REMOVE_ANNOUNCEMENT", announcementId })
  }, ANNOUNCEMENT_REMOVE_DELAY)
  announcementTimeouts.set(announcementId, timeout)
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_ANNOUNCEMENT":
      return { ...state, announcements: [action.announcement] }
    case "REMOVE_ANNOUNCEMENT":
      return {
        ...state,
        announcements: state.announcements.filter(
          (a) => a.id !== action.announcementId,
        ),
      }
    default:
      return state
  }
}

const listeners: Array<(state: State) => void> = []
let memoryState: State = { announcements: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

export interface AnnounceOptions {
  message: string
  priority?: "polite" | "assertive"
}

export function announce({ message, priority = "polite" }: AnnounceOptions): void {
  if (!message) return
  const id = genId()
  dispatch({ type: "ADD_ANNOUNCEMENT", announcement: { id, message, priority } })
  addToRemoveQueue(id)
}

export function useGlobalLiveRegion(): State & { announce: typeof announce } {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  return { ...state, announce }
}
