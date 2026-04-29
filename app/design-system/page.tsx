"use client"

import React from "react"
import { BetConfirmPattern } from "@/components/patterns/BetConfirmPattern"
import { DisputeActionPattern } from "@/components/patterns/DisputeActionPattern"
import { MechanicHelp, MechanicHelpPanel } from "@/components/patterns/MechanicHelp"
import {
  disputesHelp,
  oracleDelayHelp,
  platformFeesHelp,
} from "@/components/patterns/mechanic-help-content"
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

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-headline font-bold text-white">Progressive Disclosure</h2>
          <p className="max-w-3xl text-sm text-slate-400">
            Keep dense mechanics out of the main flow, then reveal them through a consistent help icon, tooltip, and deeper
            learn-more surface.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#40485d]/40 bg-[#111b33] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Collapsed Help State</p>
            <div className="mt-5 rounded-2xl border border-[#40485d]/40 bg-[#0b1327] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">Market closes in 2h 14m</p>
                  <p className="text-sm text-slate-400">
                    Default view stays quiet and scannable for first-time users.
                  </p>
                </div>
                <MechanicHelp content={oracleDelayHelp} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#40485d]/40 bg-[#111b33] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Expanded Help State</p>
            <div className="mt-5 space-y-4 rounded-2xl border border-[#40485d]/40 bg-[#0b1327] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">Dispute review opens after settlement</p>
                  <p className="text-sm text-slate-400">
                    Power users can pull in detail without leaving the task they were already doing.
                  </p>
                </div>
                <MechanicHelp content={disputesHelp} />
              </div>
              <MechanicHelpPanel content={disputesHelp} className="border-[#40485d]/60 bg-[#16213d] text-white" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MechanicExampleCard
            label="Fees"
            description="Attach near payout or treasury summaries."
            content={platformFeesHelp}
          />
          <MechanicExampleCard
            label="Disputes"
            description="Attach near resolution badges, warnings, and review controls."
            content={disputesHelp}
          />
          <MechanicExampleCard
            label="Oracle Delay"
            description="Attach near countdowns and resolving states."
            content={oracleDelayHelp}
          />
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

function MechanicExampleCard({
  label,
  description,
  content,
}: {
  label: string
  description: string
  content: React.ComponentProps<typeof MechanicHelp>["content"]
}) {
  return (
    <div className="rounded-2xl border border-[#40485d]/40 bg-[#111b33] p-4 text-left">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p>
        </div>
        <MechanicHelp content={content} />
      </div>
    </div>
  )
}
