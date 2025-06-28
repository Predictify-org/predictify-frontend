interface SectionHeaderProps {
  title: string;
  highlight?: string;
  description: string;
  className?: string;
}

export function SectionHeader({
  title,
  highlight,
  description,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`text-center mb-12 sm:mb-16 lg:mb-20 ${className}`}>
      <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6">
        {title}
        {highlight && (
          <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            {" "}
            {highlight}
          </span>
        )}
      </h2>
      <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 max-w-3xl mx-auto">
        {description}
      </p>
    </div>
  );
}
