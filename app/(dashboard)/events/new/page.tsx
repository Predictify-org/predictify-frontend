"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { addDays, format, startOfDay } from "date-fns"
import {
  AlertCircle,
  CalendarIcon,
  Loader2,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ConnectWalletModal } from "@/components/connect-wallet-modal"
import { useWallet } from "@/hooks/useWallet.hook"
import {
  useTransaction,
  type TransactionFailureType,
} from "@/hooks/useTransaction.hook"
import {
  MARKET_CATEGORIES,
  MARKET_DRAFT_LIMITS,
  validateMarketDraft,
  type MarketDraftErrors,
  type MarketDraftField,
} from "@/lib/market-creation"
import { buildCreateMarketIntent } from "@/lib/transaction/create-market-intent"

const FAILURE_COPY: Record<
  TransactionFailureType,
  { title: string; message: string }
> = {
  userRejected: {
    title: "Transaction cancelled",
    message:
      "You rejected the signature request. Your draft is unchanged — review it and submit again when ready.",
  },
  signFailed: {
    title: "Could not sign the transaction",
    message: "Your wallet could not sign the market creation. Unlock it and try again.",
  },
  submitFailed: {
    title: "Submission failed",
    message: "The network rejected the transaction. Your draft is unchanged; retry in a moment.",
  },
  confirmationFailed: {
    title: "Confirmation failed",
    message:
      "The transaction was submitted but the network reported a failure. Check the transaction before retrying.",
  },
  confirmationTimeout: {
    title: "Confirmation timed out",
    message:
      "The transaction was submitted but did not confirm in time. It may still land — check the explorer before retrying.",
  },
  buildFailed: {
    title: "Could not prepare the transaction",
    message:
      "The market creation transaction could not be built. Check your connection and contract configuration, then retry.",
  },
  requestFailed: {
    title: "Wallet required",
    message: "Reconnect your Stellar wallet and try again. Your draft has been kept.",
  },
}

const PENDING_LABEL = {
  signing: "Waiting for signature…",
  submitting: "Submitting…",
  confirming: "Confirming…",
  idle: "Creating market…",
  success: "Creating market…",
  failed: "Creating market…",
} as const

export default function NewEventPage() {
  const router = useRouter()
  const { isConnected, walletAddress, isConnecting } = useWallet()
  const { executeTransaction, status } = useTransaction()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [deadline, setDeadline] = useState<Date | null>(null)
  const [options, setOptions] = useState([{ text: "", probability: "" }])
  const [newOption, setNewOption] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [featuredEvent, setFeaturedEvent] = useState(false)

  const [errors, setErrors] = useState<MarketDraftErrors>({})
  const [submitFailure, setSubmitFailure] = useState<{
    type: TransactionFailureType
    error?: string
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const submittingRef = useRef(false)

  const isPending =
    isSubmitting ||
    status === "signing" ||
    status === "submitting" ||
    status === "confirming"

  const clearFieldError = (field: MarketDraftField) => {
    setErrors((previous) => {
      if (!previous[field]) return previous
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  const addOption = () => {
    if (newOption.trim() !== "") {
      setOptions([...options, { text: newOption, probability: "" }])
      setNewOption("")
      clearFieldError("options")
    }
  }

  const removeOption = (index: number) => {
    const updatedOptions = [...options]
    updatedOptions.splice(index, 1)
    setOptions(updatedOptions)
  }

  const updateOption = (index: number, text: string) => {
    const updatedOptions = [...options]
    updatedOptions[index] = { ...updatedOptions[index], text }
    setOptions(updatedOptions)
    clearFieldError("options")
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // A double-click fires two submits before the first await resolves.
    if (submittingRef.current) return

    const validation = validateMarketDraft({
      title,
      description,
      category: category || null,
      deadline,
      options,
      isPublic,
      featuredEvent,
    })

    if (!validation.success) {
      setErrors(validation.errors)
      setSubmitFailure(null)
      return
    }

    if (!isConnected || !walletAddress) {
      setErrors({ form: "Connect a Stellar wallet before creating a market." })
      setSubmitFailure(null)
      setIsWalletModalOpen(true)
      return
    }

    submittingRef.current = true
    setIsSubmitting(true)
    setErrors({})
    setSubmitFailure(null)

    try {
      const intent = await buildCreateMarketIntent(validation.data, walletAddress)
      const result = await executeTransaction(intent.buildXdr)

      if (result.success) {
        // No market id is returned by the wallet flow; land on the events list.
        router.push("/events")
        return
      }

      setSubmitFailure({
        type: result.failureType ?? "requestFailed",
        error: result.error,
      })
    } catch (error: unknown) {
      setSubmitFailure({
        type: "buildFailed",
        error:
          error instanceof Error
            ? error.message
            : "The market creation transaction could not be built.",
      })
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 id="create-event-heading" className="text-2xl font-bold tracking-tight">
          Create New Prediction Event
        </h1>
      </div>

      {!isConnected && (
        <Alert>
          <Wallet className="h-4 w-4" />
          <AlertTitle>Connect a wallet to create a market</AlertTitle>
          <AlertDescription>
            <p>
              Creating a market is an on-chain action, so you need a Stellar
              wallet connected before you can submit.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setIsWalletModalOpen(true)}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting…" : "Connect wallet"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={handleSubmit}
        aria-labelledby="create-event-heading"
        noValidate
        className="space-y-8"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                placeholder="Enter event title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  clearFieldError("title")
                }}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "title-error" : undefined}
              />
              {errors.title && (
                <p id="title-error" className="text-sm font-medium text-destructive">
                  {errors.title}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the prediction event"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  clearFieldError("description")
                }}
                className="min-h-[120px]"
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? "description-error" : undefined}
              />
              {errors.description && (
                <p id="description-error" className="text-sm font-medium text-destructive">
                  {errors.description}
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={category}
                  onValueChange={(value) => {
                    setCategory(value)
                    clearFieldError("category")
                  }}
                >
                  <SelectTrigger
                    id="category"
                    aria-invalid={Boolean(errors.category)}
                    aria-describedby={errors.category ? "category-error" : undefined}
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKET_CATEGORIES.map((marketCategory) => (
                      <SelectItem key={marketCategory} value={marketCategory}>
                        {marketCategory}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p id="category-error" className="text-sm font-medium text-destructive">
                    {errors.category}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      id="deadline"
                      aria-invalid={Boolean(errors.deadline)}
                      aria-describedby={errors.deadline ? "deadline-error" : undefined}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadline ? format(deadline, "PPP") : "Select deadline"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={deadline ?? undefined}
                      onSelect={(date) => {
                        setDeadline(date ?? null)
                        clearFieldError("deadline")
                      }}
                      disabled={{
                        before: startOfDay(addDays(new Date(), 1)),
                        after: addDays(new Date(), MARKET_DRAFT_LIMITS.maxHorizonDays),
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.deadline && (
                  <p id="deadline-error" className="text-sm font-medium text-destructive">
                    {errors.deadline}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="visibility">Event Visibility</Label>
                <Switch id="visibility" checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
              <p className="text-sm text-muted-foreground">
                {isPublic ? "Public - Visible to all users" : "Private - Visible to selected users only"}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="featured">Featured Event</Label>
                <Switch id="featured" checked={featuredEvent} onCheckedChange={setFeaturedEvent} />
              </div>
              <p className="text-sm text-muted-foreground">
                Featured events appear on the homepage and receive more visibility
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Prediction Options</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Add at least {MARKET_DRAFT_LIMITS.outcomeMin} possible outcomes for this
                prediction event
              </p>

              <Card>
                <CardContent className="p-4 space-y-4">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        aria-label={`Outcome ${index + 1}`}
                        value={option.text}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove outcome ${index + 1}`}
                        onClick={() => removeOption(index)}
                        disabled={options.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add new option"
                      aria-label="New outcome"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Add outcome"
                      onClick={addOption}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {errors.options && (
                <p id="options-error" className="mt-2 text-sm font-medium text-destructive">
                  {errors.options}
                </p>
              )}

              <div className="mt-4">
                <Label>Preview</Label>
                <div className="mt-2 p-4 border rounded-md bg-muted/40">
                  <h3 className="font-medium">{title || "Event Title"}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {description || "Event description will appear here"}
                  </p>

                  {category && <Badge className="mt-2">{category}</Badge>}

                  {deadline && <p className="text-sm mt-2">Deadline: {format(deadline, "PPP")}</p>}

                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Options:</p>
                    <ul className="space-y-1">
                      {options.map(
                        (option, index) =>
                          option.text && (
                            <li key={index} className="text-sm flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                                {index + 1}
                              </span>
                              {option.text}
                            </li>
                          ),
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {errors.form && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Check the form</AlertTitle>
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}

        {submitFailure && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{FAILURE_COPY[submitFailure.type].title}</AlertTitle>
            <AlertDescription>
              {FAILURE_COPY[submitFailure.type].message}
              {submitFailure.error ? ` (${submitFailure.error})` : null}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/events")} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isConnected || isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {PENDING_LABEL[status]}
              </>
            ) : (
              "Create Event"
            )}
          </Button>
        </div>
      </form>

      <ConnectWalletModal isOpen={isWalletModalOpen} onOpenChange={setIsWalletModalOpen} />
    </div>
  )
}
