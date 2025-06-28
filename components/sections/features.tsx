import { FeatureCard } from "@/components/cards/feature-card";
import { FEATURES } from "../constants/data";
import { SectionHeader } from "../ui/section-header";

export function Features() {
  return (
    <section
      id="features"
      className="relative py-16 sm:py-20 lg:py-32 bg-slate-950/50 backdrop-blur-sm"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Why Choose"
          highlight="Predictify?"
          description="Experience the future of prediction markets with cutting-edge blockchain technology"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
