import React from "react";
import MarketHero, { MarketHeroProps } from "../../app/markets/[id]/hero";

/**
 * MarketDetail page wrapper to satisfy the specific file structure requested.
 * It renders the MarketHero component with the provided props.
 */
export default function MarketDetail(props: MarketHeroProps) {
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <MarketHero {...props} />
    </div>
  );
}
