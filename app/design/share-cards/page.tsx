import MarketShareCard from "@/components/market/MarketShareCard";

export default function ShareCardsPreview() {
  return (
    <div className="min-h-screen bg-black p-12 space-y-24 flex flex-col items-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">Market Share Cards</h1>
        <p className="text-xl text-gray-400">Social preview layouts (1200x630)</p>
      </div>

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-white/80 border-l-4 border-primary pl-4">Active Market</h2>
        <div className="scale-[0.6] origin-top border-4 border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <MarketShareCard
            status="active"
            title="Will Bitcoin exceed $100k by the end of 2025?"
            probability={65}
            outcome="YES"
            volume="$2.5M"
            timeLeft="45 days"
          />
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-white/80 border-l-4 border-emerald-500 pl-4">Resolved Market</h2>
        <div className="scale-[0.6] origin-top border-4 border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <MarketShareCard
            status="resolved"
            title="Who will win the 2024 Presidential Election?"
            winner="Candidate X"
            volume="$12.4M"
          />
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-white/80 border-l-4 border-destructive pl-4">Disputed Market</h2>
        <div className="scale-[0.6] origin-top border-4 border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <MarketShareCard
            status="disputed"
            title="Will it rain in London on June 1st, 2024?"
          />
        </div>
      </section>

      <section className="space-y-8 pb-24">
        <h2 className="text-2xl font-semibold text-white/80 border-l-4 border-amber-500 pl-4">Tied Market</h2>
        <div className="scale-[0.6] origin-top border-4 border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <MarketShareCard
            status="tied"
            title="Final Score: Team A vs Team B (Exhibition Match)"
          />
        </div>
      </section>
    </div>
  );
}
