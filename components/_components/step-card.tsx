"use client";

import { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  bullets: string[];
  icon: ReactNode;
  iconBg: string;
}

export function StepCard({ number, title, description, bullets, icon, iconBg }: StepCardProps) {
  return (
    <div className="relative flex flex-col p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 group">
      {/* Step Number Badge */}
      <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg">
        {number}
      </div>

      {/* Icon */}
      <div className={`w-20 h-20 rounded-2xl ${iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>

      {/* Content */}
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-300 text-base leading-relaxed mb-4">{description}</p>

      {/* Bullets */}
      <ul className="space-y-2 mt-auto">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-center gap-2 text-sm text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
