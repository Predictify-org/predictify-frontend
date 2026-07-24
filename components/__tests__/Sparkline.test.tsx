import { render } from '@testing-library/react';
import Sparkline from '@/components/Sparkline';

test('renders sparkline with data', () => {
  const data = [10, 20, 15, 30, 25];
  const { getByTestId } = render(<Sparkline data={data} data-testid='sparkline-test' />);
  const svg = getByTestId('sparkline-test');
  expect(svg).toBeInTheDocument();
  // polyline should have points attribute with commas
  const polyline = svg.querySelector('polyline');
  expect(polyline).not.toBeNull();
  expect(polyline?.getAttribute('points')).toMatch(/,/);
});
