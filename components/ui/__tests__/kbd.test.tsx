import React from 'react';
import { render, screen } from '@testing-library/react';
import { Kbd } from '../kbd';
import '@testing-library/jest-dom';

describe('Kbd component', () => {
  let originalUserAgent: string;
  let originalMatchMedia: (query: string) => MediaQueryList;

  beforeAll(() => {
    originalUserAgent = navigator.userAgent;
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    window.matchMedia = originalMatchMedia;
  });

  const mockUserAgent = (ua: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: ua,
      configurable: true,
    });
  };

  const mockMatchMedia = (matches: boolean) => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  };

  it('renders macOS shortcut (Cmd+K)', () => {
    mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    mockMatchMedia(false);
    
    const { container } = render(<Kbd shortcut="search" />);
    
    expect(screen.getByText('⌘')).toBeInTheDocument();
    expect(screen.getByText('K')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('renders Windows shortcut (Ctrl+K)', () => {
    mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    mockMatchMedia(false);
    
    const { container } = render(<Kbd shortcut="search" />);
    
    expect(screen.getByText('Ctrl')).toBeInTheDocument();
    expect(screen.getByText('K')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('does not render on touch devices', () => {
    mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)');
    mockMatchMedia(true);
    
    const { container } = render(<Kbd shortcut="search" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders with action label', () => {
    mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    mockMatchMedia(false);
    
    render(<Kbd shortcut="confirmBet" actionLabel="to confirm" />);
    
    expect(screen.getByText('to confirm')).toBeInTheDocument();
    expect(screen.getByText('Enter')).toBeInTheDocument();
  });
});
