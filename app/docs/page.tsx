import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs | Predictify",
  description: "How Predictify prediction markets work on Stellar/Soroban: placing bets, claiming winnings, wallets and architecture.",
};

const sections = [
  {
    id: "overview",
    title: "What is Predictify?",
    body: [
      "Predictify is a decentralized prediction-market front end for the Stellar network. Markets are Soroban smart contracts: you stake XLM on an outcome, an oracle resolves the market, and winnings are paid out on-chain.",
      "This web app lets you browse markets, place bets, track active positions, dispute outcomes and claim winnings.",
    ],
  },
  {
    id: "wallets",
    title: "Connecting a wallet",
    body: [
      "Click Connect Wallet in the top bar and pick a Stellar wallet (Freighter, LOBSTR, xBull, Albedo or Rabet). The app uses Stellar Wallets Kit, so your keys never leave the wallet. Use the network switcher to choose testnet or mainnet.",
    ],
  },
  {
    id: "betting",
    title: "Placing a bet",
    body: [
      "Open a market, choose Yes or No, enter an amount (or use a quick-bet preset) and confirm the transaction in your wallet. Your position appears under My Bets with live odds, progress and time remaining.",
      "A daily betting allowance is shown on each market card to encourage responsible participation.",
    ],
  },
  {
    id: "claims",
    title: "Claiming winnings",
    body: [
      "Once the oracle resolves a market, winning positions become claimable on the Claims page. Eligibility is checked before you sign; successful claims produce a shareable, printable receipt.",
    ],
  },
  {
    id: "disputes",
    title: "Disputes and oracles",
    body: [
      "If you disagree with a resolution you can open a dispute during the dispute window. Oracle status for each market is shown on its detail page.",
    ],
  },
  {
    id: "architecture",
    title: "Architecture",
    body: [
      "Next.js 15 App Router, React 19 and TypeScript. UI is Tailwind CSS with Radix/shadcn components; state is Zustand plus React context. Wallet access goes through @creit.tech/stellar-wallets-kit and Soroban transactions are built and submitted from lib/stellar. Contracts live in the predictify-contracts repository.",
    ],
  },
  {
    id: "env",
    title: "Configuration",
    body: [
      "NEXT_PUBLIC_STELLAR_NETWORK (testnet or mainnet), NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_NAME, NEXT_PUBLIC_APP_URL and optional NEXT_PUBLIC_ANALYTICS_ID. All have safe defaults.",
    ],
  },
];

export default function DocsPage() {
  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
      <Link href="/" className="text-sm font-semibold text-cyan-400 hover:underline">
        &larr; Predictify
      </Link>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">Documentation</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Everything you need to understand and use Predictify, a Stellar/Soroban prediction market.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Docs sections" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-2xl font-semibold">{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="mt-3 leading-7 text-muted-foreground">
                  {p}
                </p>
              ))}
            </section>
          ))}
          <div className="rounded-xl border border-border p-5">
            <h2 className="text-lg font-semibold">Quick links</h2>
            <ul className="mt-3 flex flex-wrap gap-3 text-sm">
              <li><Link className="text-cyan-400 hover:underline" href="/markets">Browse markets</Link></li>
              <li><Link className="text-cyan-400 hover:underline" href="/bets">My bets</Link></li>
              <li><Link className="text-cyan-400 hover:underline" href="/claims">Claims</Link></li>
              <li><Link className="text-cyan-400 hover:underline" href="/help">Help</Link></li>
              <li><a className="text-cyan-400 hover:underline" href="https://github.com/Predictify-org/predictify-frontend">GitHub</a></li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
