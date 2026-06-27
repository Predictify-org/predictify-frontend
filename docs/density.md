# Card Density System

## Overview
Three density variants for market cards: **cozy**, **compact**, **ultra**.

## Tokens
| Token | Cozy | Compact | Ultra |
|-------|------|---------|-------|
| cardPadding | p-6 | p-4 | p-3 |
| titleSize | text-lg | text-base | text-sm |
| avatarSize | w-12 h-12 | w-10 h-10 | w-8 h-8 |
| thumbnailHeight | h-48 | h-36 | h-28 |

## Usage
```tsx
import { useDensity } from "@/hooks/useDensity";
const { tokens: t } = useDensity();
&lt;div className={t.cardPadding}&gt;&lt;h3 className={t.titleSize}&gt;{title}&lt;/h3&gt;&lt;/div&gt;