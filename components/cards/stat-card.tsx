import type { Stat } from "@/types/index";

interface StatCardProps {
  stat: Stat;
  index: number;
}

export function StatCard({ stat, index }: StatCardProps) {
  return (
    <div className="relative group">
      <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2">
        <div className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-2">
          {stat.value}
        </div>
        <div className="text-slate-400 font-medium text-sm sm:text-base">
          {stat.label}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
    </div>
  );
}
