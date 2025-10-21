import React from 'react';
import Image from 'next/image';

// --- Icon Definitions (Using simple inline SVGs to match the design's aesthetic) ---


const MetaMaskIcon = () => (
        <Image src="/assets/wallets/metaMask.svg" alt="MetaMask Fox Logo" width={93} height={93} />
);

const CoinbaseWalletIcon = () => (
    <Image src="/assets/wallets/coinbase.svg" alt="Coinbase Logo" width={93} height={93} />
);

const WalletConnectIcon = () => (
    <Image src="/assets/wallets/walletconect.svg" alt="Walletconect Logo" width={93} height={93} />
);

const TrustWalletIcon = () => (
    <Image src="/assets/wallets/trust-wallet.svg" alt="Trust wallet Logo" width={93} height={93} />

);

const PhantomIcon = () => (
    <Image src="/assets/wallets/phantom.svg" alt="Phantom Logo" width={93} height={93} />

);

// Tokens
const EthIcon = () => (
    <Image src="/assets/tokens/eth.svg" alt="Eth Logo" width={93} height={93} />

);

const UsdcIcon = () => (
    <Image src="/assets/tokens/usdc.svg" alt="USDC Logo" width={93} height={93} />

);

const UsdtIcon = () => (
    <Image src="/assets/tokens/usdt.svg" alt="USDT Logo" width={93} height={93} />

);

const DaiIcon = () => (
    <Image src="/assets/tokens/dai.svg" alt="DAI Logo" width={93} height={93} />

);

const PredictifyTokenIcon = () => (
    <Image src="/assets/tokens/predictify.svg" alt="Predictify Logo" width={93} height={93} />
);

// --- Data Definitions ---

const WALLETS = [
    { name: 'MetaMask', icon: MetaMaskIcon, alt: 'MetaMask Wallet Logo' },
    { name: 'Coinbase Wallet', icon: CoinbaseWalletIcon, alt: 'Coinbase Wallet Logo' },
    { name: 'WalletConnect', icon: WalletConnectIcon, alt: 'WalletConnect Logo' },
    { name: 'Trust Wallet', icon: TrustWalletIcon, alt: 'Trust Wallet Logo' },
    { name: 'Phantom', icon: PhantomIcon, alt: 'Phantom Wallet Logo' },
];

const TOKENS = [
    { ticker: 'ETH', icon: EthIcon, alt: 'Ethereum Token Logo' },
    { ticker: 'USDC', icon: UsdcIcon, alt: 'USD Coin Stablecoin Logo' },
    { ticker: 'USDT', icon: UsdtIcon, alt: 'Tether Stablecoin Logo' },
    { ticker: 'DAI', icon: DaiIcon, alt: 'Dai Stablecoin Logo' },
    { ticker: 'Predictify Token', icon: PredictifyTokenIcon, alt: 'Predictify Platform Token Logo' },
];


// --- Sub Components ---

/**
 * WalletCard Component
 * Implements uniform sizing, hover elevation, and keyboard focus ring.
 */
type WalletCardProps = {
    name: string;
    icon: React.ComponentType;
    alt: string;
};

const WalletCard = ({ name, icon: Icon, alt }: WalletCardProps) => (
    <a 
        href="#" // Placeholder link
        className="
            flex flex-col items-center justify-center p-6 space-y-3
            bg-[#1F2937] border border-[##374151] rounded-xl
            shadow-lg h-36 w-full text-center
        "
        aria-label={alt}
        tabIndex={0}
    >
        <Icon />
        <span className="text-white text-sm font-semibold">{name}</span>
    </a>
);

/**
 * TokenCard Component
 * Implements uniform sizing and ticker caption.
 */
type TokenCardProps = {
    ticker: string;
    icon: React.ComponentType;
    alt: string;
};

const TokenCard = ({ ticker, icon: Icon, alt }: TokenCardProps) => (
    <div className="
        flex flex-col items-center justify-center space-y-3 p-4 w-full h-40
        bg-[#1F2937] border border-[#1F2937] rounded-xl
        transition-colors duration-200
    ">
        <div className='flex-shrink-0'>
            <Icon />
        </div>
        <div className="text-center">
            {/* Changed text color and weight for better visibility, consistent with WalletCard */}
            <span className="text-white text-sm font-semibold">{ticker}</span>
        </div>
    </div>
);


/**
 * Main WalletsAndTokensSection Component (Aliased as App for single-file mandate)
 */
export const WalletsTokens = () => {
    // Separate the main four wallets from Phantom for the specific layout requirement
    const mainWallets = WALLETS.slice(0, 4);
    const phantomWallet = WALLETS.find(w => w.name === 'Phantom');

    return (
        <section className="py-20 font-sans">
            <div className="bg-slate-900/70 p-16 mx-36 max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
            >
                
                {/* Title & Subcopy */}
                <div className="mb-12">
                    <span className="inline-flex items-center rounded-full bg-purple-900/50 px-3 py-1 text-xs font-medium text-purple-300 ring-1 ring-inset ring-purple-600/50 uppercase tracking-widest">
                        Compatibility
                    </span>
                    <h1 className="mt-4 text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl">
                        Supported Wallets & Tokens
                    </h1>
                    <p className="mt-4 text-xl text-gray-400 max-w-3xl mx-auto">
                        Predictify works seamlessly with the most popular wallets and tokens in the crypto ecosystem.
                    </p>
                </div>

                {/* --- Compatible Wallets Section --- */}
                <div className="mb-16">
                    <h2 className="text-2xl font-bold text-white mb-8">Compatible Wallets</h2>

                    {/* Wallets Grid Layout */}
                    <div className="flex flex-col items-center">
                        {/* First Row: 4 main wallets (MetaMask, Coinbase, WalletConnect, Trust Wallet) */}
                        <div className="
                            grid grid-cols-2 gap-6
                            sm:grid-cols-3 md:grid-cols-4
                            max-w-4xl w-full
                            mb-6
                        ">
                            {mainWallets.map((wallet) => (
                                <WalletCard key={wallet.name} {...wallet} />
                            ))}
                        </div>

                        {/* Second Row: Centered Phantom Wallet */}
                        {phantomWallet && (
                            <div className="max-w-sm w-full">
                                <WalletCard {...phantomWallet} />
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Supported Tokens Section --- */}
                <div className="pt-8">
                    <h2 className="text-2xl font-bold text-white mb-8">Supported Tokens</h2>

                    {/* Tokens Grid/Row Layout */}
                    <div className="
                        grid grid-cols-3 gap-8
                        md:grid-cols-5
                        max-w-4xl mx-auto
                        
                    ">
                        {TOKENS.map((token) => (
                            <TokenCard key={token.ticker} {...token} />
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
};

// Export the main component as App for the single-file React environment
export default function App() {
    return <WalletsTokens />;
}
