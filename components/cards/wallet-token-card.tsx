import { Card } from "@/components/ui/card";
import { WalletToken } from "@/types";

interface WalletTokenCardProps {
  item: WalletToken;
  type: "wallet" | "token";
}

export function WalletTokenCard({ item, type }: WalletTokenCardProps) {
  return (
    <Card className="group bg-slate-900/30 backdrop-blur-sm border border-slate-700/50 hover:border-cyan-500/30 p-4 sm:p-6 text-center transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 shadow-lg hover:shadow-xl">
      {type === "wallet" && item.icon ? (
        <item.icon
          className={`w-8 h-8 sm:w-10 sm:h-10 ${item.color} mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}
        />
      ) : (
        <div className="relative mb-3 sm:mb-4">
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 ${item.color} rounded-full mx-auto flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
          >
            <span className="text-white font-bold text-xs sm:text-sm">
              {item.symbol}
            </span>
          </div>
          <div
            className={`absolute inset-0 w-10 h-10 sm:w-12 sm:h-12 ${item.color} rounded-full mx-auto blur opacity-50 -z-10`}
          ></div>
        </div>
      )}
      <div className="text-white font-semibold text-sm sm:text-base group-hover:text-cyan-300 transition-colors duration-300">
        {item.name}
      </div>
    </Card>
  );
}
