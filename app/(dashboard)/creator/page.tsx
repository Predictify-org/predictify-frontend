"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useWalletContext } from "@/context/WalletContext";
import { useCreatorMarkets } from "@/hooks/useCreatorMarkets";
import { useTransaction } from "@/hooks/useTransaction.hook";
import {
  computeFeesEarned,
  getAllowedCreatorActions,
  sumTokenAmounts,
  type CreatedMarket,
  type CreatorAction,
} from "@/lib/creator";
import {
  buildCreatorIntentXdr,
  createCancelMarketIntent,
  createRequestResolutionIntent,
} from "@/lib/creator-intents";
import { ConnectWalletModal } from "@/components/connect-wallet-modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PendingCreatorAction {
  market: CreatedMarket;
  action: CreatorAction;
  walletAddress: string;
}

function formatAmount(amount: string | number): string {
  const parsed = Number(amount);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 7 }).format(parsed)
    : String(amount);
}

function marketStatusLabel(status: CreatedMarket["status"]): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CreatorPage() {
  const { address, connected, isLoading: isWalletLoading } = useWalletContext();
  const {
    markets,
    isLoading,
    error: marketsError,
    applyConfirmedAction,
  } = useCreatorMarkets(connected ? address : null);
  const {
    status: transactionStatus,
    transactionError,
    executeTransaction,
    resetTransaction,
  } = useTransaction();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingCreatorAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const totalVolume = sumTokenAmounts(markets.map((market) => market.volume));
  const totalFees = sumTokenAmounts(
    markets.map((market) => computeFeesEarned(market.volume, market.feeBps))
  );

  const openConfirmation = (market: CreatedMarket, action: CreatorAction) => {
    if (!address) return;
    resetTransaction();
    setResultMessage(null);
    setResultError(null);
    setPendingAction({ market, action, walletAddress: address });
  };

  const confirmAction = async () => {
    if (!pendingAction || !address || submittingRef.current) return;
    if (!connected || pendingAction.walletAddress !== address) {
      setResultError("The connected wallet changed. Select the market action again.");
      setPendingAction(null);
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setResultMessage(null);
    setResultError(null);

    try {
      const intent =
        pendingAction.action === "cancel_market"
          ? await createCancelMarketIntent(
              pendingAction.market.id,
              pendingAction.walletAddress
            )
          : await createRequestResolutionIntent(
              pendingAction.market.id,
              pendingAction.walletAddress
            );
      const result = await executeTransaction(() => buildCreatorIntentXdr(intent));
      if (!result.success) {
        setResultError(result.error ?? transactionError ?? "The market action failed.");
        setPendingAction(null);
        return;
      }

      await applyConfirmedAction(pendingAction.market.id, pendingAction.action);
      setResultMessage(
        pendingAction.action === "cancel_market"
          ? "Market cancelled successfully."
          : "Resolution requested successfully."
      );
      setPendingAction(null);
    } catch (actionError: unknown) {
      setResultError(
        actionError instanceof Error ? actionError.message : "The market action failed."
      );
      setPendingAction(null);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (isWalletLoading) {
    return <main className="mx-auto max-w-6xl px-4 py-8">Loading wallet…</main>;
  }

  if (!connected || !address) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Creator dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Connect your wallet to view and manage the markets you created.
        </p>
        <Button className="mt-6" onClick={() => setIsWalletModalOpen(true)}>
          Connect wallet
        </Button>
        <ConnectWalletModal
          isOpen={isWalletModalOpen}
          onOpenChange={setIsWalletModalOpen}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Creator dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage markets created by your connected wallet.
          </p>
        </div>
        <Link href="/events/new">
          <Button variant="outline">Create a market</Button>
        </Link>
      </header>

      <section aria-label="Creator market totals" className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Markets" value={formatAmount(markets.length)} />
        <SummaryCard label="Total volume" value={`${formatAmount(totalVolume)} USDC`} />
        <SummaryCard label="Fees earned" value={`${formatAmount(totalFees)} USDC`} />
      </section>

      {resultMessage && (
        <Alert role="status">
          <AlertDescription>{resultMessage}</AlertDescription>
        </Alert>
      )}
      {(resultError || marketsError) && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{resultError ?? marketsError}</AlertDescription>
        </Alert>
      )}
      {transactionStatus === "signing" ||
      transactionStatus === "submitting" ||
      transactionStatus === "confirming" ? (
        <p role="status" className="text-sm text-muted-foreground">
          {transactionStatus === "signing"
            ? "Waiting for wallet approval…"
            : transactionStatus === "submitting"
              ? "Submitting transaction…"
              : "Confirming transaction…"}
        </p>
      ) : null}

      {isLoading ? (
        <p role="status" className="py-8 text-center text-muted-foreground">
          Loading your markets…
        </p>
      ) : markets.length === 0 ? (
        <section className="rounded-xl border border-dashed p-8 text-center">
          <h2 className="text-lg font-medium">No markets yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Markets created by this wallet will appear here.
          </p>
          <Button asChild className="mt-5">
            <Link href="/events/new">Create your first market</Link>
          </Button>
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Market</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Volume</th>
                  <th scope="col" className="px-4 py-3 font-medium">Fees earned</th>
                  <th scope="col" className="px-4 py-3 font-medium">Deadline</th>
                  <th scope="col" className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {markets.map((market) => (
                  <MarketRow
                    key={market.id}
                    market={market}
                    onAction={openConfirmation}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setPendingAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === "cancel_market"
                ? "Cancel this market?"
                : "Request market resolution?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === "cancel_market"
                ? `This will cancel “${pendingAction.market.title}”.`
                : `This will request resolution for “${pendingAction?.market.title ?? ""}”.`}
              {" "}Confirm the transaction in your wallet to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Back</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={(event) => {
                event.preventDefault();
                void confirmAction();
              }}
            >
              {isSubmitting ? "Processing…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function MarketRow({
  market,
  onAction,
}: {
  market: CreatedMarket;
  onAction: (market: CreatedMarket, action: CreatorAction) => void;
}) {
  const actions = getAllowedCreatorActions(market);

  return (
    <tr>
      <th scope="row" className="px-4 py-4 font-medium">
        <span className="block">{market.title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {market.id} · {market.feeBps} bps fee
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          Created{" "}
          <time dateTime={market.createdAt}>
            {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
              new Date(market.createdAt)
            )}
          </time>
        </span>
      </th>
      <td className="px-4 py-4">
        <Badge variant={market.status === "open" ? "default" : "secondary"}>
          {marketStatusLabel(market.status)}
        </Badge>
      </td>
      <td className="px-4 py-4 tabular-nums">{formatAmount(market.volume)} USDC</td>
      <td className="px-4 py-4 tabular-nums">
        {formatAmount(computeFeesEarned(market.volume, market.feeBps))} USDC
      </td>
      <td className="px-4 py-4">
        <time dateTime={market.deadline}>
          {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
            new Date(market.deadline)
          )}
        </time>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col items-start gap-2">
          <ActionButton
            label="Cancel market"
            action={actions.cancelMarket}
            onClick={() => onAction(market, "cancel_market")}
          />
          <ActionButton
            label="Request resolution"
            action={actions.requestResolution}
            onClick={() => onAction(market, "request_resolution")}
          />
        </div>
      </td>
    </tr>
  );
}

function ActionButton({
  label,
  action,
  onClick,
}: {
  label: string;
  action: ReturnType<typeof getAllowedCreatorActions>["cancelMarket"];
  onClick: () => void;
}) {
  const reasonId = useId();

  return (
    <div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!action.allowed}
        aria-describedby={!action.allowed ? reasonId : undefined}
        onClick={onClick}
      >
        {label}
      </Button>
      {!action.allowed && (
        <p id={reasonId} className="mt-1 max-w-48 text-xs text-muted-foreground">
          {action.reason}
        </p>
      )}
    </div>
  );
}
