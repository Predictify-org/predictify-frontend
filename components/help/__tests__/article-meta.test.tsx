import React from 'react';
import { render, screen } from '@testing-library/react';
import { ArticleMeta } from '../article-meta';
import '@testing-library/jest-dom';

describe('ArticleMeta component', () => {
  it('renders correctly with reading time and last reviewed date', () => {
    const content = new Array(400).fill('word').join(' '); // 400 words = 2 minutes
    render(<ArticleMeta content={content} lastReviewed="2023-10-25" />);
    
    expect(screen.getByText('2 min read')).toBeInTheDocument();
    expect(screen.getByText('Reviewed Oct 25, 2023')).toBeInTheDocument();
  });

  it('calculates 1 min read for very short articles', () => {
    const content = 'Just a few words.'; // 4 words = 1 minute (minimum)
    render(<ArticleMeta content={content} lastReviewed="2023-10-25" />);
    
    expect(screen.getByText('1 min read')).toBeInTheDocument();
  });

  it('handles missing dates gracefully', () => {
    render(<ArticleMeta wordCount={200} />);
    
    expect(screen.getByText('1 min read')).toBeInTheDocument();
    expect(screen.getByText('Reviewed Recently')).toBeInTheDocument();
  });

  it('uses provided wordCount over content string', () => {
    render(<ArticleMeta content="short" wordCount={600} />); // 600 words = 3 minutes
    
    expect(screen.getByText('3 min read')).toBeInTheDocument();
  });

  it('handles invalid dates gracefully', () => {
    render(<ArticleMeta wordCount={200} lastReviewed="invalid-date" />);
    
    expect(screen.getByText('Reviewed Recently')).toBeInTheDocument();
  });
});
