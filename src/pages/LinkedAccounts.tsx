"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  LogOut,
  RefreshCw,
  Unplug,
  Wallet,
} from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LiveRegion } from "@/components/ui/live-region"
import { useWalletContext } from "@/context/WalletContext"
import { useWallet } from "@/hooks/useWallet.hook"
import { useStellarBalance } from "@/hooks/useStellarBalance.hook"
import { getClientConfig } from "@/lib/config"
import { cn } from "@/lib/utils"

const WALLET_OPTIONS = [
  { id: "freighter", name: "Freighter", icon: "/images/freighter.png" },
  { id: "lobstr", name: "LOBSTR", icon: "/images/lobstr.png" },
  { id: "xbull", name: "XBULL", icon: "/images/xbull.svg" },
  { id: "albedo", name: "Albedo", icon: "/images/albedo.png" },
  { id: "rabet", name: "Rabet", icon: "/images/rabet.webp" },
] as const

function getExplorerUrl(address: string, network: string): string {
  const base =
    network === "mainnet"
      ? "https://stellar.expert/explorer/public"
      : "https://stellar.expert/explorer/testnet"
  return `${base}/account/${address}`
}

/**
 * LinkedAccounts page showing connected wallet details and available wallets.
 *
 * Sticky bottom action bar appears on scroll past the header with primary
 * wallet actions (copy, disconnect, view on explorer, connect new wallet).
 *
 * Responsive:
 * - Mobile (<640px): compact action labels in sticky bar.
 * - Tablet+ (640px+): full action labels visible.
 * - Desktop (1024px+): content constrained to max-w-4xl.
 *
 * Accessibility (WCAG 2.1 AA):
 * - Sticky toolbar has role="toolbar" and aria-label.
 * - aria-live region announces wallet status changes.
 * - Focus-visible rings on all interactive elements.
 * - Reduced motion: transition classes respect prefers-reduced-motion.
 */
export default function LinkedAccounts() {
  const { address, name, connected } = useWalletContext()
  const { disconnectWallet, connectWallet, isConnecting } = useWallet()
  const { balance, isLoading: balanceLoading } = useStellarBalance(
    connected ? address : null,
  )

  const [scrolled, setScrolled] = useState(false)
  const [copied, setCopied] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

  const config = getClientConfig()
  const explorerUrl = address
    ? getExplorerUrl(address, config.stellar.network)
    : null

  // Sticky bar visibility: appears when header scrolls out of view
  useEffect(() => {
    const onScroll = () => {
      const el = headerRef.current
      if (el) {
        setScrolled(el.getBoundingClientRect().bottom < 0)
      }
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleCopyAddress = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [address])

  const handleDisconnect = useCallback(async () => {
    await disconnectWallet()
  }, [disconnectWallet])

  const handleConnect = useCallback(
    async (walletId: string) => {
      await connectWallet(walletId)
    },
    [connectWallet],
  )

  const truncatedAddress = useMemo(() => {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [address])

  const availableWallets = useMemo(() => {
    return WALLET_OPTIONS.filter((w) => w.name !== name)
  }, [name])

  return (
    <>
      <LiveRegion
        message={
          connected
            ? `Connected to ${name} wallet`
            : "No wallet connected"
        }
      />

      <div
        className={cn(
          "mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-6 lg:px-8",
          "pb-[calc(4rem+var(--safe-pb,0px))] motion-reduce:pb-16",
        )}
      >
        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div ref={headerRef} data-testid="linked-accounts-header">
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Linked Accounts
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {connected
                ? `Manage your connected ${name} wallet and connect additional wallets.`
                : "Connect a Stellar wallet to start predicting."}
            </p>
          </div>
        </div>

        {/* ── Connected Wallet Card ───────────────────────────────────── */}
        {connected && address ? (
          <Card className="border-border/60 bg-card/70">
            <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Wallet
                      className="h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {truncatedAddress}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Connected
                </Badge>
              </div>

              {/* Balance display */}
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Native Balance
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {balanceLoading
                      ? "Loading..."
                      : balance
                        ? `${Number(balance).toLocaleString("en-US", { minimumFractionDigits: 7, maximumFractionDigits: 7 })} XLM`
                        : "--"}
                  </span>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-3 text-xs"
                  onClick={handleCopyAddress}
                  aria-label={copied ? "Address copied" : `Copy address ${truncatedAddress}`}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">
                    {copied ? "Copied" : "Copy Address"}
                  </span>
                  <span className="sm:hidden">
                    {copied ? "Copied" : "Copy"}
                  </span>
                </Button>

                {explorerUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 px-3 text-xs"
                    asChild
                  >
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${truncatedAddress} on Stellar Explorer (opens in new tab)`}
                    >
                      <ExternalLink
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      <span className="hidden sm:inline">
                        View on Explorer
                      </span>
                      <span className="sm:hidden">Explorer</span>
                    </a>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-3 text-xs text-destructive hover:text-destructive"
                  onClick={handleDisconnect}
                  aria-label={`Disconnect ${name} wallet from card`}
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Disconnect</span>
                  <span className="sm:hidden">Disconnect</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* ── Not Connected State ─────────────────────────────────────── */
          <Card className="border-border/60 bg-card/70">
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <Unplug
                className="h-10 w-10 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                No wallet connected. Choose a wallet below to get started.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Available Wallets ────────────────────────────────────────── */}
        <section aria-labelledby="available-wallets-heading">
          <h2
            id="available-wallets-heading"
            className="mb-3 text-sm font-medium text-muted-foreground"
          >
            {connected ? "Other Wallets" : "Available Wallets"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(connected ? availableWallets : WALLET_OPTIONS).map((wallet) => (
              <button
                key={wallet.id}
                type="button"
                onClick={() => handleConnect(wallet.id)}
                disabled={isConnecting}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border/60 bg-card/70 p-4 text-left transition-colors",
                  "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
                aria-label={`Connect ${wallet.name} wallet from available list`}
              >
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={wallet.icon || "/images/placeholder.png"}
                    alt={`${wallet.name} logo`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{wallet.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isConnecting ? "Connecting..." : "Click to connect"}
                  </p>
                </div>
                <Link2
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ── Sticky Bottom Action Bar ─────────────────────────────────── */}
      <div
        className={cn(
          "fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          "pb-safe transition-transform duration-200 motion-reduce:transition-none",
          scrolled ? "translate-y-0" : "translate-y-full",
        )}
        role="toolbar"
        aria-label="Wallet actions"
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {connected && address ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-muted-foreground whitespace-nowrap truncate">
                  <span className="font-semibold text-foreground">{name}</span>
                  {" "}
                  <span className="hidden sm:inline">{truncatedAddress}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 px-2 text-xs sm:px-3"
                  onClick={handleCopyAddress}
                  aria-label={copied ? "Address copied in toolbar" : `Copy address ${truncatedAddress} in toolbar`}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">
                    {copied ? "Copied" : "Copy"}
                  </span>
                </Button>

                {explorerUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 px-2 text-xs sm:px-3"
                    asChild
                  >
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View on Explorer (opens in new tab)`}
                    >
                      <ExternalLink
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="hidden sm:inline">Explorer</span>
                    </a>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-8 gap-1 px-2 text-xs sm:px-3"
                  onClick={handleDisconnect}
                  aria-label={`Disconnect ${name} wallet from toolbar`}
                >
                  <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Disconnect</span>
                  <span className="sm:hidden">
                    <Unplug className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-muted-foreground">
                  No wallet connected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-8 gap-1 px-2 text-xs sm:px-3"
                  onClick={() => handleConnect("freighter")}
                  disabled={isConnecting}
                  aria-label="Connect Freighter wallet from toolbar"
                >
                  <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Connect Wallet</span>
                  <span className="sm:hidden">Connect</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
