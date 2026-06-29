import React from 'react';
import { render } from '@testing-library/react';
import PredictionCard from '../PredictionCard';
import { Prediction } from '../../types/predictions';

const createMockPrediction = (category?: string, outcome?: 'Yes' | 'No'): Prediction => ({
  id: 'test-1',
  title: 'Test Prediction',
  description: 'Test Description',
  category,
  outcome,
  stakeAmount: 10,
  stakeToken: 'USDC',
  odds: 1.5,
  potentialWinnings: 15,
  winningsToken: 'USDC',
  eventDate: '01/01/2024',
  status: 'active',
});

describe('PredictionCard Snapshots', () => {
  const categories = ['sports', 'crypto', 'politics', 'weather', 'esports', 'unknown-category'];

  categories.forEach((category) => {
    it(`should match snapshot for category: ${category} with 'Yes' outcome`, () => {
      const { container } = render(
        <PredictionCard prediction={createMockPrediction(category, 'Yes')} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it(`should match snapshot for category: ${category} with 'No' outcome`, () => {
      const { container } = render(
        <PredictionCard prediction={createMockPrediction(category, 'No')} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  it('should match snapshot without outcome', () => {
    const { container } = render(
      <PredictionCard prediction={createMockPrediction()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
