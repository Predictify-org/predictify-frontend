import { TrendingUp } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ size = "md", showText = true }: LogoProps) {
  const sizeClasses = {
    sm: { icon: "w-6 h-6", container: "w-8 h-8", text: "text-xl" },
    md: {
      icon: "w-6 h-6",
      container: "w-10 h-10",
      text: "text-2xl sm:text-3xl",
    },
    lg: {
      icon: "w-8 h-8",
      container: "w-12 h-12",
      text: "text-3xl sm:text-4xl",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex items-center space-x-3">
      <div className="relative">
        <div
          className={`${classes.container} bg-gradient-to-br from-cyan-400 via-emerald-400 to-purple-400 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25 transform rotate-3 hover:rotate-6 transition-transform duration-300`}
        >
          <TrendingUp className={`${classes.icon} text-slate-950 font-bold`} />
        </div>
        <div
          className={`absolute inset-0 ${classes.container} bg-gradient-to-br from-cyan-400 via-emerald-400 to-purple-400 rounded-xl blur opacity-50 -z-10`}
        ></div>
      </div>
      {showText && (
        <span
          className={`${classes.text} font-bold bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400 bg-clip-text text-transparent`}
        >
          Predictify
        </span>
      )}
    </div>
  );
}
