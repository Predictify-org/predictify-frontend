"use client";

import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { LeaderboardUser } from "@/lib/leaderboard-data";
import { cn } from "@/lib/utils";

interface YourRankChipProps {
  user: LeaderboardUser;
  isVisible: boolean;
}

export function YourRankChip({ user, isVisible }: YourRankChipProps) {
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state if user becomes visible again (so it can show up again if they scroll away later)
  useEffect(() => {
    if (isVisible) setDismissed(false);
  }, [isVisible]);

  return (
    <AnimatePresence>
      {!isVisible && !dismissed && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-cyan-500 text-slate-950 px-4 py-2 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center gap-3 border border-cyan-300">
            <div className="flex items-center gap-2 pr-2 border-r border-slate-900/20">
              <span className="text-xs font-bold uppercase tracking-tighter">Your Rank</span>
              <span className="text-lg font-black italic">#{user.rank}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 border border-slate-900/10">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-bold">+{user.profit} XLM</span>
            </div>

            <button 
              onClick={() => setDismissed(true)}
              className="ml-1 p-1 hover:bg-slate-950/10 rounded-full transition-colors"
              aria-label="Dismiss rank chip"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
