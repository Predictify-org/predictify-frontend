import {
  saveScrollPosition,
  getScrollPosition,
  clearScrollPosition,
  clearAllScrollPositions,
} from "../scroll-position-store"

describe("scroll-position-store", () => {
  beforeEach(() => {
    clearAllScrollPositions()
  })

  describe("saveScrollPosition", () => {
    it("should save scroll position for a given key", () => {
      saveScrollPosition("/events", 500)
      expect(getScrollPosition("/events")).toBe(500)
    })

    it("should overwrite existing position when saving same key twice", () => {
      saveScrollPosition("/events", 500)
      saveScrollPosition("/events", 1000)
      expect(getScrollPosition("/events")).toBe(1000)
    })

    it("should save different positions for different keys", () => {
      saveScrollPosition("/events", 500)
      saveScrollPosition("/events?filter=crypto", 1000)
      
      expect(getScrollPosition("/events")).toBe(500)
      expect(getScrollPosition("/events?filter=crypto")).toBe(1000)
    })
  })

  describe("getScrollPosition", () => {
    it("should return 0 for unknown key", () => {
      expect(getScrollPosition("/unknown")).toBe(0)
    })

    it("should return saved position for known key", () => {
      saveScrollPosition("/events", 750)
      expect(getScrollPosition("/events")).toBe(750)
    })

    it("should return 0 after clearing position", () => {
      saveScrollPosition("/events", 500)
      clearScrollPosition("/events")
      expect(getScrollPosition("/events")).toBe(0)
    })
  })

  describe("clearScrollPosition", () => {
    it("should clear position for specific key", () => {
      saveScrollPosition("/events", 500)
      saveScrollPosition("/markets", 1000)
      
      clearScrollPosition("/events")
      
      expect(getScrollPosition("/events")).toBe(0)
      expect(getScrollPosition("/markets")).toBe(1000)
    })

    it("should not throw error when clearing non-existent key", () => {
      expect(() => clearScrollPosition("/non-existent")).not.toThrow()
    })
  })

  describe("clearAllScrollPositions", () => {
    it("should clear all saved positions", () => {
      saveScrollPosition("/events", 500)
      saveScrollPosition("/markets", 1000)
      saveScrollPosition("/profile", 1500)
      
      clearAllScrollPositions()
      
      expect(getScrollPosition("/events")).toBe(0)
      expect(getScrollPosition("/markets")).toBe(0)
      expect(getScrollPosition("/profile")).toBe(0)
    })
  })
})
