import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Feature } from "@/types/index";

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

export function FeatureCard({ feature, index }: FeatureCardProps) {
  return (
    <Card className="relative group bg-slate-900/30 backdrop-blur-sm border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 shadow-xl hover:shadow-2xl">
      <CardHeader className="p-6 sm:p-8">
        <div className="relative mb-6">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center ${feature.shadow} shadow-lg transform rotate-3 group-hover:rotate-6 transition-transform duration-300`}
          >
            <feature.icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <div
            className={`absolute inset-0 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl blur opacity-50 -z-10`}
          ></div>
        </div>
        <CardTitle className="text-white text-xl sm:text-2xl font-bold mb-4 group-hover:text-cyan-300 transition-colors duration-300">
          {feature.title}
        </CardTitle>
        <CardDescription className="text-slate-300 text-base sm:text-lg leading-relaxed">
          {feature.description}
        </CardDescription>
      </CardHeader>
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
    </Card>
  );
}
