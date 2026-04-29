/**
 * Scroll Position Store
 * 
 * In-memory store for preserving scroll positions across navigation.
 * Keyed by route path to support independent scroll restoration for filtered views.
 * Session-scoped (not persisted to localStorage).
 */

const scrollPositions = new Map<string, number>()

/**
 * Save scroll position for a given route key
 * @param key - Route path (e.g., '/events', '/events?filter=crypto')
 * @param position - Scroll offset in pixels
 */
export function saveScrollPosition(key: string, position: number): void {
  scrollPositions.set(key, position)
}

/**
 * Get saved scroll position for a route key
 * @param key - Route path
 * @returns Scroll position in pixels, or 0 if not found
 */
export function getScrollPosition(key: string): number {
  return scrollPositions.get(key) ?? 0
}

/**
 * Clear saved scroll position for a route key
 * @param key - Route path
 */
export function clearScrollPosition(key: string): void {
  scrollPositions.delete(key)
}

/**
 * Clear all saved scroll positions
 */
export function clearAllScrollPositions(): void {
  scrollPositions.clear()
}
