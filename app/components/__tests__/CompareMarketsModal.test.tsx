import React from 'react';
import { render, screen } from '@testing-library/react';
import { CompareMarketsModal } from '../CompareMarketsModal';
import { Market } from '@/content/markets.sample';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

const mockMarketA: Market = {
  id: 'market-1',
  title: 'Market Alpha',
  description: 'Description for Market Alpha',
  icon: 'TrendingUp',
  iconColor: 'blue',
  yesOdds: 60,
  noOdds: 40,
  poolAmount: 1000,
  endsIn: '2 days',
  sparklineData: [],
  status: 'active'
};

const mockMarketB: Market = {
  id: 'market-2',
  title: 'Market Beta',
  description: 'Description for Market Beta',
  icon: 'Globe',
  iconColor: 'purple',
  yesOdds: 45,
  noOdds: 55,
  poolAmount: 2500,
  endsIn: '5 days',
  sparklineData: [],
  status: 'ended'
};

describe('CompareMarketsModal', () => {
  it('renders correctly when open and displays market data', () => {
    const handleClose = jest.fn();
    render(
      <CompareMarketsModal 
        isOpen={true} 
        onClose={handleClose} 
        marketA={mockMarketA} 
        marketB={mockMarketB} 
      />
    );
    
    expect(screen.getByText('Market Alpha')).toBeInTheDocument();
    expect(screen.getByText('Market Beta')).toBeInTheDocument();
    
    expect(screen.getByText('Description for Market Alpha')).toBeInTheDocument();
    expect(screen.getByText('Description for Market Beta')).toBeInTheDocument();
    
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
    
    expect(screen.getByText('$1,000')).toBeInTheDocument();
    expect(screen.getByText('$2,500')).toBeInTheDocument();
  });

  it('renders empty columns if markets are not provided', () => {
    const handleClose = jest.fn();
    render(
      <CompareMarketsModal 
        isOpen={true} 
        onClose={handleClose} 
        marketA={null} 
        marketB={null} 
      />
    );
    
    const emptyStates = screen.getAllByText('No market selected');
    expect(emptyStates).toHaveLength(2);
  });
});
