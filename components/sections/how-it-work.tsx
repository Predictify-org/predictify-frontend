import { StepCard } from "@/components/cards/step-card";
import { SectionHeader } from "../ui/section-header";
import { HOW_IT_WORKS_STEPS_DATA } from "@/components/constants/data";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-16 sm:py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="How It"
          highlight="Works"
          description="Get started in minutes with our simple 4-step process"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12">
          {HOW_IT_WORKS_STEPS_DATA.map((step, index) => {
            const IconComponent = step.iconComponent;
            return (
              <StepCard
                key={index}
                number={step.number}
                title={step.title}
                description={step.description}
                bullets={step.bullets}
                icon={<IconComponent className="w-8 h-8 text-white" />}
                iconBg={step.iconBg}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
