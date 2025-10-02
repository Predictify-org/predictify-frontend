import { Feature } from '@/content/features';
import { FC } from 'react';

/**
 * Reusable Feature Card Component
 * @param feature - The feature data including icon, title, and body.
 */
export const FeatureCard: FC<{ feature: Feature }> = ({ feature }) => {
  return (
    <div
      // Base styles for the card, ensuring consistent height and dark mode contrast (AA on a very dark background)
      className="
        flex flex-col p-6 h-full min-h-[250px] md:min-h-[280px] lg:min-h-[300px] 
        rounded-xl shadow-lg 
        bg-purple-900/50 border border-purple-800/80 text-white 
        transition-all duration-300 ease-in-out
        hover:bg-purple-800/70 hover:shadow-xl 
        active:bg-purple-700/80 active:scale-[0.98]
      "
    >
      {/* Icon Area: Inline SVG allows tinting with Tailwind classes */}
      <div className="text-purple-400 mb-4 h-8 w-8 flex items-center justify-center">
        {feature.icon}
      </div>

      <h3 className="text-xl font-bold mb-3 text-white">
        {feature.title}
      </h3>

      <p className="text-base text-purple-200 leading-relaxed">
        {feature.body}
      </p>
    </div>
  );
};