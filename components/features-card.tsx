import { Feature } from "../app/content/features";
import { FC } from "react";

/**
 * Reusable Feature Card Component
 * @param feature
 */
export const FeatureCard: FC<{ feature: Feature }> = ({ feature }) => {
  return (
    <div
      className=" w-[333.375px]
        flex flex-col p-6 h-[532px] min-h-[250px] md:min-h-[280px] lg:min-h-[300px] 
        rounded-xl shadow-lg 
        bg-[#3a1b62] border border-[#374151] text-white 
      "
    >
      {/* Icon Area: Inline SVG allows tinting with Tailwind classes */}
      <div className="mb-6">
        {feature.icon}
      </div>

      <h3 className="text-h4 font-bold mb-3 text-white">{feature.title}</h3>

      <p className="text-body-lg text-[#D1D5DB] leading-relaxed">
        {feature.body}
      </p>
    </div>
  );
};
