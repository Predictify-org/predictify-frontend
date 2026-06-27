"use client"

import { useEffect, useRef } from "react"

export interface UseParallaxOptions {
  /**
   * The maximum amount of pixels to translate the element.
   * Default: 12 (as per design tokens)
   */
  depth?: number
  /**
   * Whether the parallax effect is disabled.
   */
  disabled?: boolean
}

// Global registry to ensure only ONE requestAnimationFrame callback runs per frame
const registry = new Set<{
  element: HTMLDivElement
  depth: number
  isVisible: boolean
}>()

let globalFrameId: number | null = null

/**
 * Global update loop for all parallax elements
 */
const startGlobalLoop = () => {
  if (globalFrameId !== null) return

  const update = () => {
    const isLargeScreen = window.innerWidth >= 768
    const viewportHeight = window.innerHeight
    const viewportCenter = viewportHeight / 2

    registry.forEach((item) => {
      if (item.isVisible && isLargeScreen) {
        const rect = item.element.getBoundingClientRect()
        const elementCenter = rect.top + rect.height / 2
        const distanceFromCenter = elementCenter - viewportCenter
        
        // Calculate progress relative to viewport center
        const progress = Math.max(-1, Math.min(1, distanceFromCenter / viewportHeight))
        const offset = progress * item.depth
        
        // Apply GPU-friendly transform directly to DOM
        item.element.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`
      } else if (!isLargeScreen && item.element.style.transform !== "translate3d(0px, 0px, 0px)") {
        item.element.style.transform = "translate3d(0, 0, 0)"
      }
    })

    globalFrameId = requestAnimationFrame(update)
  }

  globalFrameId = requestAnimationFrame(update)
}

const stopGlobalLoop = () => {
  if (registry.size === 0 && globalFrameId !== null) {
    cancelAnimationFrame(globalFrameId)
    globalFrameId = null
  }
}

/**
 * useParallax
 * 
 * A performance-optimized, motion-safe parallax hook.
 * Uses a single global rAF loop for all elements to maximize efficiency.
 */
export function useParallax({ depth = 12, disabled = false }: UseParallaxOptions = {}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (disabled || prefersReducedMotion) {
      if (ref.current) ref.current.style.transform = "translate3d(0, 0, 0)"
      return
    }

    const element = ref.current
    if (!element) return

    // Entry state for the global loop
    const entry = {
      element,
      depth,
      isVisible: false
    }

    registry.add(entry)
    startGlobalLoop()

    const observer = new IntersectionObserver(
      ([record]) => {
        entry.isVisible = record.isIntersecting
      },
      { threshold: 0 }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
      registry.delete(entry)
      stopGlobalLoop()
    }
  }, [depth, disabled])

  return ref
}
