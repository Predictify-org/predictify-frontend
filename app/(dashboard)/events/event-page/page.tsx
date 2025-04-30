"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Clock, DollarSign, Users, BarChart2, Loader2 } from "lucide-react";
import { formatDistanceToNowStrict, parseISO, isValid } from "date-fns";

interface EventOption {
  id: string;
  text: string;
}

interface HistoricalEntry {
  year: number;
  winner: string;
  pool: number;
}

interface EventData {
  id: string;
  title: string;
  category: string;
  description: string;
  deadline: string;
  options: EventOption[];
  totalPool: number;
  participants: number;
  odds: { [key: string]: number };
  historicalData?: HistoricalEntry[];
}

const initialMockEventData: EventData = {
  id: "1",
  title: "Super Bowl Winner 2025",
  category: "Sports",
  description:
    "Predict which team will win the Super Bowl LIX scheduled to be played on February 9, 2025. Place your bets before the deadline!",
  deadline: "2025-06-09T12:00:00Z",
  options: [
    { id: "opt1", text: "Kansas City Chiefs" },
    { id: "opt2", text: "San Francisco 49ers" },
    { id: "opt3", text: "Detroit Lions" },
    { id: "opt4", text: "Other AFC Team" },
    { id: "opt5", text: "Other NFC Team" },
  ],
  totalPool: 15780.5,
  participants: 1245,
  odds: {
    opt1: 2.5,
    opt2: 3.0,
    opt3: 5.0,
    opt4: 8.0,
    opt5: 7.5,
  },
  historicalData: [
    { year: 2024, winner: "Kansas City Chiefs", pool: 12000 },
    { year: 2023, winner: "Kansas City Chiefs", pool: 10500 },
  ],
};

const calculateTimeLeft = (deadlineISO: string | undefined): string => {
  if (!deadlineISO) return "No deadline set";
  try {
    const deadlineDate = parseISO(deadlineISO);
    if (!isValid(deadlineDate)) {
      return "Invalid date";
    }
    const now = new Date();

    if (deadlineDate <= now) {
      return "Event Closed";
    }

    return formatDistanceToNowStrict(deadlineDate, { addSuffix: true });
  } catch (error) {
    console.error("Error parsing deadline:", error);
    return "Invalid date";
  }
};

export default function EventDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = typeof params?.id === "string" ? params.id : undefined;

  const [eventData, setEventData] = useState<EventData>(() => ({
    ...initialMockEventData,
    id: eventId ?? initialMockEventData.id,
  }));
  const [timeLeft, setTimeLeft] = useState<string>(() =>
    calculateTimeLeft(eventData.deadline)
  );
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<string>("");
  const [isSubmittingBet, setIsSubmittingBet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (eventId && eventId !== eventData.id) {
      console.warn(
        "URL event ID changed, but only mock data is used. Consider fetching real data."
      );
    }
  }, [eventId, eventData.id]);

  useEffect(() => {
    if (!eventData.deadline || !isValid(parseISO(eventData.deadline))) return;

    setTimeLeft(calculateTimeLeft(eventData.deadline));

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(eventData.deadline);
      setTimeLeft(newTimeLeft);
      if (newTimeLeft === "Event Closed") {
        clearInterval(timer);
      }
    }, 1000 * 60);

    return () => clearInterval(timer);
  }, [eventData.deadline]);

  const handleBetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitSuccessMessage(null);

    if (!selectedOption) {
      setError("Please select an option to bet on.");
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid positive bet amount.");
      return;
    }
    if (timeLeft === "Event Closed") {
      setError("Betting is closed for this event.");
      return;
    }

    setIsSubmittingBet(true);

    try {
      console.log("Simulating bet placement:", {
        eventId: eventData.id,
        optionId: selectedOption,
        amount: amount,
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Bet placed successfully! Updating state...");
      setSubmitSuccessMessage("Bet placed successfully!");

      setEventData((prevData) => {
        if (!prevData) return prevData;

        const winningOptionText =
          prevData.options.find((opt) => opt.id === selectedOption)?.text ||
          "Unknown Outcome";
        const currentYear = new Date().getFullYear();
        const updatedPool = prevData.totalPool + amount;

        const newHistoryEntry: HistoricalEntry = {
          year: currentYear,
          winner: winningOptionText,
          pool: updatedPool,
        };

        const updatedHistoricalData = [
          newHistoryEntry, 
          ...(prevData.historicalData || []),
        ];

        return {
          ...prevData,
          totalPool: updatedPool,
          participants: prevData.participants + 1,
          historicalData: updatedHistoricalData,
        };
      });

      setBetAmount("");
      setSelectedOption(null);
    } catch (apiError) {
      console.error("Error during bet submission simulation:", apiError);
      setError("An unexpected error occurred while placing your bet.");
      setSubmitSuccessMessage(null);
    } finally {
      setIsSubmittingBet(false);
    }
  };

  const isEventClosed = timeLeft === "Event Closed";
  const currentOdds = selectedOption
    ? eventData.odds[selectedOption]
    : undefined;
  const potentialPayout =
    currentOdds && betAmount ? parseFloat(betAmount || "0") * currentOdds : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {eventData.title}
          </h1>
          <Badge variant="outline">{eventData.category}</Badge>
        </div>
        <p className="text-muted-foreground">{eventData.description}</p>
      </div>

      <Separator className="my-6" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Status</CardTitle>
            </CardHeader>
            {/* <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-muted-foreground">Closes</p>
                  <p
                    className={`font-medium ${
                      isEventClosed ? "text-red-600" : ""
                    }`}
                  >
                    {timeLeft}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-muted-foreground">Total Pool</p>
                  <p className="font-medium">
                    $
                    {eventData.totalPool.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-muted-foreground">Participants</p>
                  <p className="font-medium">
                    {eventData.participants.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent> */}

            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-muted-foreground">Closes</p>
                  <p
                    className={`font-medium ${
                      isEventClosed ? "text-red-600" : ""
                    }`}
                  >
                    {timeLeft}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-muted-foreground">Total Pool</p>
                  <p className="font-medium">
                    $
                    {eventData.totalPool.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-muted-foreground">Participants</p>
                  <p className="font-medium">
                    {eventData.participants.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* <Card>
            <CardHeader>
              <CardTitle>Prediction Options & Odds</CardTitle>
              <CardDescription>
                Select an outcome and place your prediction.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={selectedOption ?? undefined}
                onValueChange={(value) => {
                  setSelectedOption(value);
                  setError(null);
                  setSubmitSuccessMessage(null);
                }}
                className="space-y-3"
                disabled={isEventClosed || isSubmittingBet}
              >
                {eventData.options.map((option) => (
                  <Label
                    key={option.id}
                    htmlFor={option.id}
                    className={`flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                      selectedOption === option.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : ""
                    } ${
                      isEventClosed || isSubmittingBet
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem
                        value={option.id}
                        id={option.id}
                        disabled={isEventClosed || isSubmittingBet}
                      />
                      <span>{option.text}</span>
                    </div>
                    <Badge variant="secondary">
                      Odds: {eventData.odds[option.id]?.toFixed(1) ?? "N/A"}x
                    </Badge>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card> */}

          <Card>
            <CardHeader>
              <CardTitle>Prediction Options & Odds</CardTitle>
              <CardDescription>
                Select an outcome and place your prediction.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={selectedOption ?? undefined}
                onValueChange={(value) => {
                  setSelectedOption(value);
                  setError(null);
                  setSubmitSuccessMessage(null);
                }}
                className="space-y-3"
                disabled={isEventClosed || isSubmittingBet}
              >
                {eventData.options.map((option) => (
                  <Label
                    key={option.id}
                    htmlFor={option.id}
                    className={`flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                      selectedOption === option.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : ""
                    } ${
                      isEventClosed || isSubmittingBet
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem
                        value={option.id}
                        id={option.id}
                        disabled={isEventClosed || isSubmittingBet}
                      />
                      <span>{option.text}</span>
                    </div>
                    <Badge variant="secondary">
                      Odds: {eventData.odds[option.id]?.toFixed(1) ?? "N/A"}x
                    </Badge>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {eventData.historicalData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5" /> Historical Data
                </CardTitle>
                <CardDescription>
                  Past outcomes for similar events.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {eventData.historicalData.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {eventData.historicalData.map((data, index) => (
                      <li
                        key={`${data.year}-${data.winner}-${index}`}
                        className="flex justify-between items-center border-b pb-1 last:border-b-0"
                      >
                        <span>
                          {data.year}:{" "}
                          <span className="font-medium">{data.winner}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Pool: ${data.pool.toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No historical data available for this event type.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Place Your Prediction</CardTitle>
            </CardHeader>
            <form onSubmit={handleBetSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bet-amount">Bet Amount ($)</Label>
                  <Input
                    id="bet-amount"
                    type="number"
                    placeholder="e.g., 10.00"
                    value={betAmount}
                    onChange={(e) => {
                      setBetAmount(e.target.value);
                      setError(null);
                      setSubmitSuccessMessage(null);
                    }}
                    min="0.01"
                    step="0.01"
                    required
                    disabled={
                      isEventClosed || isSubmittingBet || !selectedOption
                    }
                    aria-describedby="payout-info error-info success-info"
                  />
                </div>
                {selectedOption && currentOdds !== undefined && (
                  <p id="payout-info" className="text-sm text-muted-foreground">
                    Potential Payout: $
                    {potentialPayout.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    {betAmount
                      ? ` (at ${currentOdds.toFixed(1)}x odds)`
                      : " (enter amount)"}
                  </p>
                )}
                {error && (
                  <p id="error-info" className="text-sm text-red-600">
                    {error}
                  </p>
                )}
                {submitSuccessMessage && (
                  <p id="success-info" className="text-sm text-green-600">
                    {submitSuccessMessage}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isEventClosed ||
                    isSubmittingBet ||
                    !selectedOption ||
                    !betAmount ||
                    !!error
                  }
                >
                  {isSubmittingBet ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Placing Bet...
                    </>
                  ) : (
                    "Place Bet"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
