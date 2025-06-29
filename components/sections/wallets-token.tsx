import { WalletTokenCard } from "@/components/cards/wallet-token-card";
import { SUPPORTED_WALLETS, SUPPORTED_TOKENS } from "../constants/data";
import { SectionHeader } from "../ui/section-header";

export function WalletsTokens() {
  return (
    <section
      id="wallets"
      className="relative py-16 sm:py-20 lg:py-32 bg-slate-950/50 backdrop-blur-sm"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Supported"
          highlight="Wallets & Tokens"
          description="Use your favorite wallet and tokens across multiple blockchain networks"
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 lg:gap-16">
          {/* Wallets */}
          <div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-8 sm:mb-12 text-center">
              Supported Wallets
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
              {SUPPORTED_WALLETS.map((wallet, index) => (
                <WalletTokenCard key={index} item={wallet} type="wallet" />
              ))}
            </div>
          </div>

          {/* Tokens */}
          <div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-8 sm:mb-12 text-center">
              Supported Tokens
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
              {SUPPORTED_TOKENS.map((token, index) => (
                <WalletTokenCard key={index} item={token} type="token" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
