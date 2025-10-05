import { Check } from "lucide-react";

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  bullets: string[];
  icon: React.ReactNode;
}

export function StepCard({
  number,
  title,
  description,
  bullets,
  icon,
}: StepCardProps) {
  return (
    <div className="relative bg-slate-900/30 backdrop-blur-[32.5px] border border-slate-700 rounded-[23.37px] p-9 transition-all duration-300 hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/10 flex flex-col h-full">
      <div className="absolute -top-5 -left-5 z-10">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shadow-purple-500/50">
          <span className="text-xl font-bold text-white">{number}</span>
        </div>
      </div>

      <h3 className="text-[24.83px] leading-[40.89px] font-semibold text-white mb-6 text-center">
        {title}
      </h3>

      <div className="flex justify-center mb-6">
        <div className="w-[93.47px] h-[93.47px] rounded-full bg-indigo-900/30 flex items-center justify-center">
          {icon}
        </div>
      </div>

      <p className="text-[19.86px] leading-[35.05px] text-slate-300 text-center mb-6">
        {description}
      </p>

      <ul className="space-y-4 flex-grow" role="list">
        {bullets.map((bullet, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0 relative w-[32px] h-[32px]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24px] h-[24px] rounded-full border-[2.5px] border-emerald-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className="w-[20px] h-[20px] text-emerald-500" strokeWidth={2.5} />
              </div>
            </div>
            <span className="text-slate-300 text-[17.38px] leading-[29.21px]">
              {bullet}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
