"use client";

import * as React from "react";
import { kpis, KpiMetric } from "../../content/kpis.sample";
import { useCountUp } from "@/lib/use-count-up";

const AnimatedMetric: React.FC<{ metric: KpiMetric }> = ({ metric }) => {
  const [ref, animatedValue] = useCountUp(
    metric.value,
    0,
    2000 
  );

  const formatNumber = (num: number) => {
    const fixedNum = num.toFixed(metric.decimals ?? 0);
    const formatted =
      metric.decimals === 0
        ? Math.round(num).toLocaleString()
        : fixedNum.toLocaleString();
    return formatted;
  };

  const displayValue = formatNumber(animatedValue);

  return (
    <div
      ref={ref}
      className="flex flex-col items-center justify-center rounded-xl p-4 md:p-6 text-center"
    >
      <div
        className="w-[166px] h-[40px] flex items-center justify-center bg-gradient-to-r from-[rgba(129,140,248,1)] to-[rgba(168,85,247,1)] text-[30px] font-extrabold text-black mb-1"
        aria-live="off"
      >
        {metric.prefix}
        <span className="tabular-nums text-gray-900 text-[30px]">
          {displayValue}
        </span>
        {metric.unit}
        {metric.suffix}
      </div>
      {/* Label Caption */}
      <div className="text-[24px] md:text-base font-medium text-[#FCFCFC]">
        {metric.label}
        {metric.tooltip && (
          <span
            className="ml-1 cursor-help opacity-70"
            title={metric.tooltip}
          ></span>
        )}
      </div>
    </div>
  );
};

// Main Component
export const KpiStrip: React.FC = () => {
  return (
    <section className="py-8 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {kpis.map((metric) => (
            <AnimatedMetric key={metric.id} metric={metric} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default KpiStrip;
