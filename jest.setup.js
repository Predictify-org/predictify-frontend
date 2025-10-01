import '@testing-library/jest-dom'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock scrollTo for testing scroll behavior
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
})

// Mock HTMLElement scrollTo
Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
  value: jest.fn(),
  writable: true
})
