"use client"

import React from "react"
import { BetConfirmPattern } from "@/components/patterns/BetConfirmPattern"
import { DisputeActionPattern } from "@/components/patterns/DisputeActionPattern"
import { Info } from "lucide-react"

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto space-y-12">
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-3xl font-headline font-bold text-cyan-400 mb-2">Predictify Design System</h1>
        <p className="text-slate-400">Standardized Modal and Drawer Interactions</p>
      </div>

      <section className="space-y-6">
        <div className="flex items-start gap-3 bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl text-cyan-200">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <h3 className="font-bold text-cyan-400 font-headline">Interaction Rules</h3>
            <ul className="list-disc pl-4 space-y-1 opacity-90">
              <li>Desktop (&gt;= 768px): Always uses centered Modals for confirmations.</li>
              <li>Mobile (&lt; 768px): Uses Bottom Drawers for complex forms mapped to thumb-zone.</li>
              <li>Primary actions are verbs (e.g., "Confirm Prediction", "Submit Evidence").</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-8">
        <section className="bg-[#192540]/30 border border-[#40485d]/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[300px]">
          <div>
            <h2 className="text-xl font-headline font-bold text-white mb-1">Bet Confirmation</h2>
            <p className="text-xs text-slate-400">Dynamic Dialog / Drawer hybrid</p>
          </div>
          <div className="w-full max-w-xs">
            <BetConfirmPattern />
          </div>
        </section>

        <section className="bg-[#192540]/30 border border-[#40485d]/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[300px]">
          <div>
            <h2 className="text-xl font-headline font-bold text-white mb-1">Dispute Action</h2>
            <p className="text-xs text-slate-400">Complex form with max-height scroller</p>
          </div>
          <div className="w-full max-w-xs">
            <DisputeActionPattern />
          </div>
        </section>
      </div>
    </div>
  )
}
