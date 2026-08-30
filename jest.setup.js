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

// Mock window.matchMedia (not available in jsdom).
// Tests that need specific values can override this via jest.spyOn or re-mock.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
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

// Mock navigator.clipboard - configurable so userEvent can override
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
  writable: true,
  configurable: true,
});

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
