"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { LeaderboardUser } from "@/lib/leaderboard-data";

interface LeaderboardPodiumProps {
  topThree: LeaderboardUser[];
}

export function LeaderboardPodium({ topThree }: LeaderboardPodiumProps) {
  const [first, second, third] = topThree;

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 py-8 mb-8">
      {/* 2nd Place */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center"
      >
        <div className="relative mb-2">
          <Avatar className="h-16 w-16 border-2 border-slate-300 ring-4 ring-slate-300/20">
            <AvatarImage src={second?.avatarUrl} alt={second?.name} />
            <AvatarFallback>{second?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="absolute -top-2 -right-2 bg-slate-300 text-slate-900 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
            2
          </div>
        </div>
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-t-lg w-20 h-24 flex flex-col items-center justify-center p-2 text-center">
          <span className="text-xs font-semibold text-white truncate w-full">{second?.name}</span>
          <span className="text-[10px] text-cyan-400">+{second?.profit}</span>
        </div>
      </motion.div>

      {/* 1st Place */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center -mt-8"
      >
        <div className="relative mb-3">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl">👑</div>
          <Avatar className="h-24 w-24 border-4 border-yellow-500 ring-8 ring-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
            <AvatarImage src={first?.avatarUrl} alt={first?.name} />
            <AvatarFallback>{first?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="absolute -top-2 -right-2 bg-yellow-500 text-slate-900 text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">
            1
          </div>
        </div>
        <div className="bg-slate-800/60 backdrop-blur-md border border-yellow-500/30 rounded-t-lg w-28 h-40 flex flex-col items-center justify-center p-3 text-center shadow-xl">
          <span className="text-sm font-bold text-white truncate w-full">{first?.name}</span>
          <span className="text-xs text-yellow-400 font-semibold">+{first?.profit} XLM</span>
          <div className="mt-2 text-[10px] text-slate-400">
            {first?.winRate}% Win Rate
          </div>
        </div>
      </motion.div>

      {/* 3rd Place */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col items-center"
      >
        <div className="relative mb-2">
          <Avatar className="h-16 w-16 border-2 border-amber-600 ring-4 ring-amber-600/20">
            <AvatarImage src={third?.avatarUrl} alt={third?.name} />
            <AvatarFallback>{third?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="absolute -top-2 -right-2 bg-amber-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
            3
          </div>
        </div>
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-t-lg w-20 h-20 flex flex-col items-center justify-center p-2 text-center">
          <span className="text-xs font-semibold text-white truncate w-full">{third?.name}</span>
          <span className="text-[10px] text-cyan-400">+{third?.profit}</span>
        </div>
      </motion.div>
    </div>
  );
}
