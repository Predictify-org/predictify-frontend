import React, { useState, useCallback } from "react";
import { LiveRegion } from "@/components/LiveRegion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { StellarWaveEmptyState } from "@/components/EmptyState";

type FormState = "idle" | "submitting" | "success" | "error";

export interface BetFormProps {
  campaignActive?: boolean;
}

export default function BetForm({ campaignActive = true }: BetFormProps = {}) {
  const [formState, setFormState] = useState<FormState>("idle");
  const [announcement, setAnnouncement] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setFormState("error");
      setAnnouncement("Invalid bet amount. Please enter a valid number greater than 0.");
      return;
    }

    setFormState("submitting");
    setAnnouncement("Placing your bet. Please wait.");

    // Simulate an API call
    setTimeout(() => {
      setFormState("success");
      setAnnouncement(`Bet of ${amount} placed successfully!`);
      setAmount("");
    }, 1500);
  }, [amount]);

  return (
    <div className="mx-auto max-w-md p-4 sm:p-6 lg:p-8">
      {!campaignActive ? (
        <StellarWaveEmptyState />
      ) : (
        <>
          <LiveRegion message={announcement} />

          <Card className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Place Your Bet</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="bet-amount" className="mb-1 block text-sm font-medium text-foreground">
                Bet Amount (XLM)
              </label>
              <input
                id="bet-amount"
                type="number"
                min="0.1"
                step="0.1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 tabular-nums"
                placeholder="Enter amount"
                aria-describedby={formState === "error" ? "bet-error" : undefined}
                disabled={formState === "submitting"}
              />
              {formState === "error" && (
                <p id="bet-error" className="mt-1 text-xs text-destructive">
                  Invalid bet amount.
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={formState === "submitting"}
              className="w-full rounded-full"
            >
              {formState === "submitting" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing Bet…
                </>
              ) : (
                "Place Bet"
              )}
            </Button>
          </form>

          {formState === "success" && (
            <div className="mt-4 rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
              Bet placed successfully!
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
