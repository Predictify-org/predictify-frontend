# Predictify

A decentralized prediction market platform built on the Stellar blockchain. Predictify enables users to create and participate in prediction markets on virtually any verifiable future event, from sports to politics to financial outcomes. All predictions and outcomes are transparently recorded on-chain with instant, automated payouts through smart contracts.

## About

Predictify is designed for anyone who wants to monetize their knowledge and intuition through prediction markets. Whether you're a sports enthusiast, crypto trader, political analyst, or simply someone with good instincts, Predictify provides a transparent, decentralized platform where your predictions can turn into rewards. The platform leverages Stellar's fast, low-cost transactions to ensure seamless user experience with instant payouts and minimal fees.

Built with Next.js 15, React 19, TypeScript, and the Stellar Wallets Kit, Predictify offers a modern, responsive interface that works seamlessly across desktop and mobile devices. The platform supports multiple Stellar wallets including Freighter, LOBSTR, XBull, Albedo, and Rabet, giving users flexibility in how they interact with the blockchain.

## Features

- **Decentralized & Transparent**: All predictions are recorded on-chain with complete transparency. No central authority controls the outcomes.
- **Instant Payouts**: Smart contracts automatically distribute winnings immediately after event resolution. No waiting periods.
- **Multi-Wallet Support**: Connect with your preferred Stellar wallet (Freighter, LOBSTR, XBull, Albedo, Rabet).
- **Real-Time Markets**: Access live prediction markets with real-time updates on odds, stakes, and participant activity.
- **Advanced Analytics**: Track your prediction performance with detailed analytics and insights.
- **Create Your Markets**: Anyone can create prediction markets on virtually any verifiable future event.
- **Verified Oracles**: Multiple oracle sources ensure accurate and tamper-proof event outcomes.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Blockchain**: Stellar Network
- **Wallet Integration**: [@creit.tech/stellar-wallets-kit](https://www.npmjs.com/package/@creit.tech/stellar-wallets-kit)
- **UI Components**: Radix UI, shadcn/ui
- **State Management**: Zustand, React Context
- **Form Handling**: React Hook Form, Zod
- **Testing**: Jest, React Testing Library

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher
- **pnpm**: v10.18.0 or higher (required package manager)
- **Git**: For version control

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/predictify-frontend.git
cd predictify-frontend
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Configure the following environment variables:

```env
# Stellar Network Configuration
NEXT_PUBLIC_STELLAR_NETWORK=testnet
# Options: 'testnet' or 'mainnet'

# API Configuration (if applicable)
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Application Configuration
NEXT_PUBLIC_APP_NAME=Predictify
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### 5. Build for Production

```bash
pnpm build
pnpm start
```

## Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Stellar Network Configuration

Predictify currently supports the Stellar Testnet by default. To switch to Mainnet:

1. Update `constants/wallet-kits.constant.ts`:
   ```typescript
   network: WalletNetwork.MAINNET
   ```

2. Update your `.env.local`:
   ```env
   NEXT_PUBLIC_STELLAR_NETWORK=mainnet
   ```

**⚠️ Important**: Always test thoroughly on Testnet before deploying to Mainnet. Never use real funds on Testnet.

## Project Structure

```
predictify-frontend/
├── app/                      # Next.js App Router pages
│   ├── (auth)/              # Authentication routes
│   ├── (dashboard)/         # Protected dashboard routes
│   │   ├── bets/           # User bets page
│   │   ├── dashboard/      # Main dashboard
│   │   ├── disputes/       # Dispute resolution
│   │   ├── events/         # Events management
│   │   ├── finances/       # Financial overview
│   │   ├── mypredictions/  # User predictions
│   │   ├── profile/        # User profile
│   │   ├── settings/       # Settings page
│   │   └── verification/   # KYC verification
│   └── (marketing)/        # Public marketing pages
├── components/              # React components
│   ├── active-bets/        # Active bets components
│   ├── cards/              # Card components
│   ├── events/             # Event-related components
│   ├── navbar/             # Navigation components
│   ├── sections/           # Page sections
│   └── ui/                 # Reusable UI components (shadcn/ui)
├── context/                 # React Context providers
│   └── WalletContext.tsx   # Wallet state management
├── hooks/                   # Custom React hooks
│   └── useWallet.hook.ts   # Wallet integration hook
├── lib/                     # Utility functions and helpers
├── constants/               # Application constants
├── types/                   # TypeScript type definitions
└── public/                  # Static assets
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for detailed guidelines.

Quick start:

### Development Workflow

1. **Fork the repository** and create your feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes** following our code style:
   - Use TypeScript for all new code
   - Follow the existing code structure and naming conventions
   - Write meaningful commit messages
   - Add tests for new features

3. **Test your changes**:
   ```bash
   pnpm test
   pnpm lint
   ```

4. **Commit your changes**:
   ```bash
   git commit -m "Add amazing feature"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request** with a clear description of your changes

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules (run `pnpm lint` before committing)
- Use functional components with hooks
- Prefer named exports over default exports
- Keep components small and focused
- Add JSDoc comments for complex functions

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Stellar Documentation](https://developers.stellar.org/)
- [Stellar Wallets Kit](https://github.com/creit-tech/stellar-wallets-kit)
- [Figma Design](https://www.figma.com/design/0WWKE7970cnVtuuTFv8lSI/Predictify)

## Network Information

### Stellar Testnet
- **Horizon URL**: `https://horizon-testnet.stellar.org`
- **Network Passphrase**: `Test SDF Network ; September 2015`
- **Friendbot**: Available for test account funding

### Stellar Mainnet
- **Horizon URL**: `https://horizon.stellar.org`
- **Network Passphrase**: `Public Global Stellar Network ; September 2015`

## Troubleshooting

### Wallet Connection Issues

If you're having trouble connecting your wallet:

1. Ensure your wallet extension is installed and unlocked
2. Check that you're on the correct network (Testnet/Mainnet)
3. Clear browser cache and try again
4. Check the browser console for error messages

### Build Errors

If you encounter build errors:

1. Delete `node_modules` and `.next` directories
2. Run `pnpm install` again
3. Clear pnpm cache: `pnpm store prune`
4. Check that all environment variables are set correctly

## License

[Add your license here]

## Contributors

<!-- Add contributors here -->
- [Your Name](https://github.com/yourusername)

## Support

For support, please open an issue in the GitHub repository or contact the development team.

---

Built with ❤️ on Stellar
