import { Check } from "lucide-react";

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  bullets: string[];
  icon: React.ReactNode;
  iconBg?: string;
}

export function StepCard({
  number,
  title,
  description,
  bullets,
  icon,
  iconBg = "bg-indigo-900/30",
}: StepCardProps) {
  return (
    <div className="relative bg-slate-900/40 backdrop-blur-[32.5px] border border-slate-700/50 rounded-[23.37px] p-10 transition-all duration-300 hover:border-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/20 flex flex-col h-full shadow-lg shadow-purple-900/30">
      {/* Inner glow effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent rounded-[23.37px] pointer-events-none"></div>

      {/* Numbered Badge */}
      <div className="absolute -top-6 -left-6 z-10">
        <div className="relative">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 shadow-2xl shadow-purple-500/60">
            <span className="text-xl font-bold text-white">{number}</span>
          </div>
          {/* Extra glow layer */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 blur-xl opacity-60 -z-10"></div>
        </div>
      </div>

      <h3 className="text-[24.83px] leading-[40.89px] font-semibold text-white mb-8 text-center mt-2">
        {title}
      </h3>

      <div className="flex justify-center mb-8">
        <div className={`w-[93.47px] h-[93.47px] rounded-full ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
      </div>

      <p className="text-[19.86px] leading-[35.05px] text-slate-300 text-center mb-8">
        {description}
      </p>

      <ul className="space-y-4 flex-grow" role="list">
        {bullets.map((bullet, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0 relative w-[32px] h-[32px]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24px] h-[24px] rounded-full border-[2.5px] border-[#22C55E]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className="w-[20px] h-[20px] text-[#22C55E]" strokeWidth={2.5} />
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