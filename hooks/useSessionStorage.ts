"use client"

import { useState, useEffect, useCallback } from "react"

export function useSessionStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  useEffect(() => {
    try {
      const item = window.sessionStorage.getItem(key)
      if (item !== null) {
        setStoredValue(JSON.parse(item) as T)
      }
    } catch {
      setStoredValue(initialValue)
    }
  }, [key, initialValue])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value
        try {
          window.sessionStorage.setItem(key, JSON.stringify(nextValue))
        } catch {
          // sessionStorage full or unavailable
        }
        return nextValue
      })
    },
    [key],
  )

  return [storedValue, setValue] as const
}
