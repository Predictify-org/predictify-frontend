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

// Mock requestAnimationFrame for count-up / animation hooks.
// Each call advances the timestamp by 500 ms so animations complete
// within two frames (500 ms > the hook's 400 ms default duration).
// Reset the clock before each test to prevent timestamp drift across suites.
let rAFTime = 0;
global.requestAnimationFrame = (cb) => {
  const time = rAFTime;
  rAFTime += 500;
  cb(time);
  return 1;
};
global.cancelAnimationFrame = () => {};

beforeEach(() => {
  rAFTime = 0;
});

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
