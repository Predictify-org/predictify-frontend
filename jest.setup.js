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

// Suppress console.error for known React warnings in tests
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Received `true` for a non-boolean attribute `fill`') ||
     args[0].includes('non-boolean attribute `fill`'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};
