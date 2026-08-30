import { ReactNode } from 'react';

/** Shape of a single feature item used by FeatureCard */
export interface Feature {
  /** Icon element rendered at the top of the card */
  icon: ReactNode;
  /** Short headline for the feature */
  title: string;
  /** Longer descriptive body text */
  body: string;
}
