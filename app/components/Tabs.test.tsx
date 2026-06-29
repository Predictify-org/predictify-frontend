/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { Tabs, TabDefinition } from './Tabs';

describe('Tabs Component', () => {
  const mockTabs: TabDefinition[] = [
    {
      id: 'tab1',
      label: 'Tab 1',
      content: <div>Content 1</div>,
    },
    {
      id: 'tab2',
      label: 'Tab 2',
      content: <div>Content 2</div>,
    },
    {
      id: 'tab3',
      label: 'Tab 3',
      content: <div>Content 3</div>,
    },
  ];

  describe('Rendering', () => {
    it('renders all tabs with correct labels', () => {
      render(<Tabs tabs={mockTabs} />);

      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 3' })).toBeInTheDocument();
    });

    it('renders first tab content by default', () => {
      render(<Tabs tabs={mockTabs} />);

      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('renders default tab when defaultTabId is provided', () => {
      render(<Tabs tabs={mockTabs} defaultTabId="tab2" />);

      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('handles empty tabs array', () => {
      const { container } = render(<Tabs tabs={[]} />);

      expect(container.querySelector('.tabs')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has tablist role on header', () => {
      render(<Tabs tabs={mockTabs} />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('has correct tab roles and attributes', () => {
      render(<Tabs tabs={mockTabs} />);

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });

      expect(tab1).toHaveAttribute('aria-selected', 'true');
      expect(tab1).toHaveAttribute('aria-controls', 'tab1-panel');
      expect(tab1).toHaveAttribute('id', 'tab1-tab');

      expect(tab2).toHaveAttribute('aria-selected', 'false');
      expect(tab2).toHaveAttribute('aria-controls', 'tab2-panel');
    });

    it('has tabpanel role with correct attributes', () => {
      render(<Tabs tabs={mockTabs} />);

      const panel = screen.getByRole('tabpanel');

      expect(panel).toHaveAttribute('id', 'tab1-panel');
      expect(panel).toHaveAttribute('aria-labelledby', 'tab1-tab');
    });

    it('updates aria-selected when switching tabs', () => {
      render(<Tabs tabs={mockTabs} />);

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });

      expect(tab1).toHaveAttribute('aria-selected', 'true');
      expect(tab2).toHaveAttribute('aria-selected', 'false');

      fireEvent.click(tab2);

      expect(tab1).toHaveAttribute('aria-selected', 'false');
      expect(tab2).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Click Interactions', () => {
    it('switches to a different tab on click', () => {
      render(<Tabs tabs={mockTabs} />);

      fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));

      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('calls onChange callback when switching tabs', () => {
      const handleChange = jest.fn();
      render(<Tabs tabs={mockTabs} onChange={handleChange} />);

      fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));

      expect(handleChange).toHaveBeenCalledWith('tab2');
    });

    it('handles multiple tab switches', () => {
      const handleChange = jest.fn();
      render(<Tabs tabs={mockTabs} onChange={handleChange} />);

      fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));
      fireEvent.click(screen.getByRole('tab', { name: 'Tab 3' }));
      fireEvent.click(screen.getByRole('tab', { name: 'Tab 1' }));

      expect(handleChange).toHaveBeenCalledTimes(3);
      expect(handleChange).toHaveBeenNthCalledWith(1, 'tab2');
      expect(handleChange).toHaveBeenNthCalledWith(2, 'tab3');
      expect(handleChange).toHaveBeenNthCalledWith(3, 'tab1');
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates to next tab with ArrowRight', () => {
      render(<Tabs tabs={mockTabs} />);

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      fireEvent.keyDown(tab1, { key: 'ArrowRight' });

      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('navigates to previous tab with ArrowLeft', () => {
      render(<Tabs tabs={mockTabs} defaultTabId="tab2" />);

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      fireEvent.keyDown(tab2, { key: 'ArrowLeft' });

      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('navigates to next tab with ArrowDown', () => {
      render(<Tabs tabs={mockTabs} />);

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      fireEvent.keyDown(tab1, { key: 'ArrowDown' });

      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('navigates to previous tab with ArrowUp', () => {
      render(<Tabs tabs={mockTabs} defaultTabId="tab2" />);

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      fireEvent.keyDown(tab2, { key: 'ArrowUp' });

      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('wraps around to last tab with ArrowLeft from first tab', () => {
      render(<Tabs tabs={mockTabs} />);

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      fireEvent.keyDown(tab1, { key: 'ArrowLeft' });

      expect(screen.getByText('Content 3')).toBeInTheDocument();
    });

    it('wraps around to first tab with ArrowRight from last tab', () => {
      render(<Tabs tabs={mockTabs} defaultTabId="tab3" />);

      const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
      fireEvent.keyDown(tab3, { key: 'ArrowRight' });

      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('goes to first tab with Home key', () => {
      render(<Tabs tabs={mockTabs} defaultTabId="tab3" />);

      const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
      fireEvent.keyDown(tab3, { key: 'Home' });

      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('goes to last tab with End key', () => {
      render(<Tabs tabs={mockTabs} />);

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      fireEvent.keyDown(tab1, { key: 'End' });

      expect(screen.getByText('Content 3')).toBeInTheDocument();
    });

    it('prevents default key behavior for navigation keys', () => {
      render(<Tabs tabs={mockTabs} />);

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      jest.spyOn(event, 'preventDefault');

      fireEvent.keyDown(tab1, { key: 'ArrowRight' });

      // Navigation should work
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('ignores non-navigation keys', () => {
      render(<Tabs tabs={mockTabs} />);

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      fireEvent.keyDown(tab1, { key: 'Enter' });

      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('applies active class to active tab button', () => {
      render(<Tabs tabs={mockTabs} />);

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });

      expect(tab1).toHaveClass('tabs__button--active');
      expect(tab2).not.toHaveClass('tabs__button--active');
    });

    it('updates active class when switching tabs', () => {
      render(<Tabs tabs={mockTabs} />);

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });

      fireEvent.click(tab2);

      expect(tab1).not.toHaveClass('tabs__button--active');
      expect(tab2).toHaveClass('tabs__button--active');
    });

    it('has tabs class on root element', () => {
      const { container } = render(<Tabs tabs={mockTabs} />);

      expect(container.querySelector('.tabs')).toBeInTheDocument();
    });

    it('has tabs__header class on tab header', () => {
      const { container } = render(<Tabs tabs={mockTabs} />);

      expect(container.querySelector('.tabs__header')).toBeInTheDocument();
    });

    it('has tabs__content class on content area', () => {
      const { container } = render(<Tabs tabs={mockTabs} />);

      expect(container.querySelector('.tabs__content')).toBeInTheDocument();
    });
  });
});
