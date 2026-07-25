"use client"

import { useCallback, useSyncExternalStore } from "react"

export interface RecentlyViewedItem {
  id: string
  title: string
  category: string
  href: string
  viewedAt: number
}

const STORAGE_KEY = "predictify-recently-viewed"
const MAX_ITEMS = 10

function getSnapshot(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: RecentlyViewedItem[] = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

function emit() {
  window.dispatchEvent(new Event("storage"))
}

function persist(items: RecentlyViewedItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // localStorage full or unavailable – silently ignore
  }
}

export function useRecentlyViewed() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const addRecentlyViewed = useCallback(
    (item: { id: string; title: string; category: string; href: string }) => {
      const current = getSnapshot()
      const filtered = current.filter((i) => i.id !== item.id)
      const updated = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(
        0,
        MAX_ITEMS
      )
      persist(updated)
      emit()
    },
    []
  )

  const removeRecentlyViewed = useCallback((id: string) => {
    const current = getSnapshot()
    const updated = current.filter((i) => i.id !== id)
    persist(updated)
    emit()
  }, [])

  const clearRecentlyViewed = useCallback(() => {
    persist([])
    emit()
  }, [])

  return {
    items,
    addRecentlyViewed,
    removeRecentlyViewed,
    clearRecentlyViewed,
  }
}
