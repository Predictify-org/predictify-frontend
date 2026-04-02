import { KpiCard } from "@/components/analytics/kpi-card";
import { ChartPanel } from "@/components/analytics/chart-panel";
import { VolumeChart } from "@/components/analytics/volume-chart";
import { DistributionChart } from "@/components/analytics/distribution-chart";

const kpis = [
  {
    label: "Total Volume",
    value: "$14.8M",
    unit: "XLM",
    delta: "+18% vs last month",
    deltaPositive: true,
    tooltip: "Total value of all predictions settled on-chain.",
  },
  {
    label: "Active Users",
    value: "10,241",
    delta: "+201 this week",
    deltaPositive: true,
    tooltip: "Unique wallets that placed at least one prediction.",
  },
  {
    label: "Markets Created",
    value: "1,204",
    delta: "+34 this week",
    deltaPositive: true,
    tooltip: "Total prediction markets opened on the platform.",
  },
  {
    label: "Avg. Payout Time",
    value: "2.4",
    unit: "sec",
    delta: "-0.3s vs last month",
    deltaPositive: true,
    tooltip: "Median time from event resolution to wallet credit.",
  },
];

export default function AnalyticsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Analytics</h1>

      {/* KPI strip — 2 cols on mobile, 4 on desktop */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </section>

      {/* Charts — stacked on mobile, side-by-side on lg */}
      <section aria-label="Charts" className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <ChartPanel
          title="Prediction Volume"
          description="Monthly settled volume (XLM)"
          className="lg:col-span-3"
        >
          <VolumeChart />
        </ChartPanel>

        <ChartPanel
          title="Market Distribution"
          description="Share of markets by category (%)"
          className="lg:col-span-2"
        >
          <DistributionChart />
        </ChartPanel>
      </section>
    </div>
  );
}
