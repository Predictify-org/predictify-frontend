/**
 * theme-noflash.test.ts — Tests for no-flash theme utilities
 */

import {
  getTheme,
  applyTheme,
  setTheme,
  initTheme,
  getThemeScript,
  type Theme,
} from './theme-noflash';

// Mock window and document for node environment
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

const mockMatchMedia = jest.fn();

const mockDocumentElement = {
  classList: {
    remove: jest.fn(),
    add: jest.fn(),
    contains: jest.fn(),
  },
};

const mockDocument = {
  documentElement: mockDocumentElement,
};

// Mock global objects
(global as any).window = {
  localStorage: mockLocalStorage,
  matchMedia: mockMatchMedia,
};

(global as any).document = mockDocument;

describe('theme-noflash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocumentElement.classList.contains.mockReturnValue(false);
  });

  describe('getTheme', () => {
    it('returns stored theme from localStorage when available', () => {
      mockLocalStorage.getItem.mockReturnValue('light');
      const theme = getTheme();
      expect(theme).toBe('light');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('streampay-theme');
    });

    it('returns stored dark theme from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('dark');
      const theme = getTheme();
      expect(theme).toBe('dark');
    });

    it('falls back to system preference when localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockMatchMedia.mockReturnValue({ matches: true });
      const theme = getTheme();
      expect(theme).toBe('dark');
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    it('returns light when system prefers light mode', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockMatchMedia.mockReturnValue({ matches: false });
      const theme = getTheme();
      expect(theme).toBe('light');
    });

    it('defaults to dark when localStorage and matchMedia are unavailable', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });
      Object.defineProperty(window, 'matchMedia', { value: undefined });
      const theme = getTheme();
      expect(theme).toBe('dark');
    });

    it('ignores invalid localStorage values', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid');
      mockMatchMedia.mockReturnValue({ matches: true });
      const theme = getTheme();
      expect(theme).toBe('dark');
    });
  });

  describe('applyTheme', () => {
    it('adds dark class to document element', () => {
      applyTheme('dark');
      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('dark', 'light');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('adds light class to document element', () => {
      applyTheme('light');
      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('dark', 'light');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('light');
    });

    it('stores theme in localStorage', () => {
      applyTheme('light');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('streampay-theme', 'light');
    });

    it('handles missing document gracefully', () => {
      const originalDocument = (global as any).document;
      (global as any).document = undefined;
      expect(() => applyTheme('dark')).not.toThrow();
      (global as any).document = originalDocument;
    });
  });

  describe('setTheme', () => {
    it('calls applyTheme with the given theme', () => {
      setTheme('dark');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
    });
  });

  describe('initTheme', () => {
    it('detects and applies theme on initialization', () => {
      mockLocalStorage.getItem.mockReturnValue('light');
      initTheme();
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('light');
    });

    it('applies system preference when no stored theme', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockMatchMedia.mockReturnValue({ matches: true });
      initTheme();
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
    });
  });

  describe('getThemeScript', () => {
    it('returns a valid inline script string', () => {
      const script = getThemeScript();
      expect(typeof script).toBe('string');
      expect(script).toContain('localStorage');
      expect(script).toContain('prefers-color-scheme');
      expect(script).toContain('classList');
    });

    it('includes the correct storage key', () => {
      const script = getThemeScript();
      expect(script).toContain('streampay-theme');
    });

    it('includes both theme classes', () => {
      const script = getThemeScript();
      expect(script).toContain('dark');
      expect(script).toContain('light');
    });

    it('is wrapped in an IIFE', () => {
      const script = getThemeScript();
      expect(script).toMatch(/^\s*\(function\(\)/);
    });
  });

  describe('theme persistence', () => {
    it('persists theme choice across sessions', () => {
      setTheme('light');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('streampay-theme', 'light');
      
      mockLocalStorage.getItem.mockReturnValue('light');
      const retrievedTheme = getTheme();
      expect(retrievedTheme).toBe('light');
    });

    it('allows theme switching', () => {
      setTheme('dark');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
      
      setTheme('light');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('light');
    });
  });

  describe('edge cases', () => {
    it('handles localStorage access errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Access denied');
      });
      // When localStorage fails, should fall back to system preference
      // Set matchMedia to prefer dark mode
      mockMatchMedia.mockReturnValue({ matches: true });
      const theme = getTheme();
      expect(theme).toBe('dark');
    });

    it('handles localStorage setItem errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      expect(() => applyTheme('dark')).not.toThrow();
    });

    it('handles undefined matchMedia', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      Object.defineProperty(window, 'matchMedia', { value: undefined });
      const theme = getTheme();
      expect(theme).toBe('dark');
    });
  });
});
