import { Step } from "@/types/index";

interface StepCardProps {
  step: Step;
  index: number;
}

export function StepCard({ step, index }: StepCardProps) {
  return (
    <div className="text-center group">
      <div className="relative mb-6 sm:mb-8">
        <div
          className={`w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 bg-gradient-to-br ${step.gradient} rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/25 transform group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300`}
        >
          <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            {step.step}
          </span>
        </div>
        <div
          className={`absolute inset-0 w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 bg-gradient-to-br ${step.gradient} rounded-3xl blur opacity-50 mx-auto -z-10`}
        ></div>
      </div>
      <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4 sm:mb-6 group-hover:text-cyan-300 transition-colors duration-300">
        {step.title}
      </h3>
      <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xs mx-auto">
        {step.description}
      </p>
    </div>
  );
}
