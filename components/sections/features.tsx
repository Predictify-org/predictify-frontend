import { features } from "../../app/content/features";
import { FeatureCard } from "../features-card";

export default function FeaturesSection() {
  return (
    <section className="py-20 bg-[#540D8D] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center rounded-full bg-[#312E81] px-3 py-1 text-xs font-medium text-[#FCFCFC] text-[14px]">
            Why Choose Predictify
          </span>

          <h2 className="mt-4 text-[46px] font-extrabold text-[#FFFFFF] sm:text-5xl">
            Built for Predictors, Powered by Blockchain
          </h2>

          <p className="mt-4 text-[23px] text-[#D1D5DB] mx-auto">
            Our platform combines cutting-edge blockchain technology with an
            intuitive interface to create the most reliable prediction market
            available.
          </p>
        </div>

        {/* Features Grid */}
        <div
          className="
            grid gap-10
            grid-cols-1                
            md:grid-cols-2             
            lg:grid-cols-3             
            auto-rows-fr 
            justify-between
            items-center
            sm:pl-9 pl-0               
          "
        >
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
