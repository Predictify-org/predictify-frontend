/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";
import * as themeNoFlash from "../utils/theme-noflash";

describe("ThemeToggle", () => {
  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    const localStorageMock = {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value.toString();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        for (const key in store) {
          delete store[key];
        }
      })
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders with system as default when no localStorage value", () => {
    render(<ThemeToggle />);
    const systemRadio = screen.getByLabelText("System") as HTMLInputElement;
    expect(systemRadio.checked).toBe(true);
  });

  it("renders with light when light is in localStorage", () => {
    window.localStorage.setItem("streampay-theme", "light");
    render(<ThemeToggle />);
    const lightRadio = screen.getByLabelText("Light") as HTMLInputElement;
    expect(lightRadio.checked).toBe(true);
  });

  it("calls setTheme and updates state when selecting dark", () => {
    const setThemeSpy = jest.spyOn(themeNoFlash, 'setTheme').mockImplementation(() => {});
    render(<ThemeToggle />);
    
    const darkRadio = screen.getByLabelText("Dark");
    fireEvent.click(darkRadio);
    
    expect(setThemeSpy).toHaveBeenCalledWith("dark");
    expect((darkRadio as HTMLInputElement).checked).toBe(true);
  });
  
  it("removes localStorage item when system is selected", () => {
    window.localStorage.setItem("streampay-theme", "light");
    render(<ThemeToggle />);
    
    const systemRadio = screen.getByLabelText("System");
    fireEvent.click(systemRadio);
    
    expect(window.localStorage.removeItem).toHaveBeenCalledWith("streampay-theme");
  });
});
