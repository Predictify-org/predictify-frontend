"use client"

import { useState, useCallback, useMemo } from "react"
import {
  CheckCircle,
  Clock,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
  ArrowUpDown,
  UserCheck,
  ShieldCheck,
  ClipboardCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { VerificationStepper, type Step, type StepState } from "@/components/verification/VerificationStepper"
import { useSessionStorage } from "@/hooks/useSessionStorage"

const STEPS_CONFIG = [
  { id: "select", label: "Select Event", icon: Search },
  { id: "review", label: "Review Event", icon: FileText },
  { id: "winner", label: "Select Winner", icon: UserCheck },
  { id: "notes", label: "Add Notes", icon: ClipboardCheck },
  { id: "confirm", label: "Confirm", icon: ShieldCheck },
]

const pendingEvents = [
  {
    id: "1",
    title: "Super Bowl Winner 2023",
    category: "Sports",
    deadline: "2023-02-12",
    endDate: "2023-02-12",
    options: [
      { id: "1a", text: "Kansas City Chiefs", probability: 0.55 },
      { id: "1b", text: "Philadelphia Eagles", probability: 0.45 },
    ],
    participants: 2345,
    status: "pending",
  },
  {
    id: "2",
    title: "Oscar Best Picture 2023",
    category: "Entertainment",
    deadline: "2023-03-12",
    endDate: "2023-03-12",
    options: [
      { id: "2a", text: "Everything Everywhere All at Once", probability: 0.65 },
      { id: "2b", text: "All Quiet on the Western Front", probability: 0.15 },
      { id: "2c", text: "The Banshees of Inisherin", probability: 0.1 },
      { id: "2d", text: "Other", probability: 0.1 },
    ],
    participants: 1876,
    status: "pending",
  },
  {
    id: "3",
    title: "Bitcoin Price on Jan 1, 2023",
    category: "Finance",
    deadline: "2023-01-01",
    endDate: "2023-01-01",
    options: [
      { id: "3a", text: "Above $20,000", probability: 0.4 },
      { id: "3b", text: "Below $20,000", probability: 0.6 },
    ],
    participants: 3421,
    status: "pending",
  },
  {
    id: "4",
    title: "UK Prime Minister by End of 2022",
    category: "Politics",
    deadline: "2022-12-31",
    endDate: "2022-12-31",
    options: [
      { id: "4a", text: "Rishi Sunak", probability: 0.75 },
      { id: "4b", text: "Keir Starmer", probability: 0.15 },
      { id: "4c", text: "Other", probability: 0.1 },
    ],
    participants: 1543,
    status: "pending",
  },
]

const verifiedEvents = [
  {
    id: "5",
    title: "French Open Men's Singles Winner 2023",
    category: "Sports",
    verifiedDate: "2023-06-11",
    winningOption: "Novak Djokovic",
    verifiedBy: "admin@example.com",
  },
  {
    id: "6",
    title: "Eurovision Winner 2023",
    category: "Entertainment",
    verifiedDate: "2023-05-13",
    winningOption: "Sweden",
    verifiedBy: "admin@example.com",
  },
]

function getStepState(
  stepIndex: number,
  currentStep: number,
  stepErrors: Record<number, boolean>,
): StepState {
  if (stepErrors[stepIndex]) return "error"
  if (stepIndex === currentStep) return "current"
  if (stepIndex < currentStep) return "done"
  return "incomplete"
}

export default function VerificationPage() {
  const [currentStep, setCurrentStep] = useSessionStorage("verification:currentStep", 0)
  const [selectedEventId, setSelectedEventId] = useSessionStorage<string | null>("verification:selectedEventId", null)
  const [selectedOption, setSelectedOption] = useSessionStorage("verification:selectedOption", "")
  const [verificationNotes, setVerificationNotes] = useSessionStorage("verification:notes", "")
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [stepErrors, setStepErrors] = useState<Record<number, boolean>>({})
  const [showSuccess, setShowSuccess] = useState(false)

  const selectedEvent = useMemo(
    () => pendingEvents.find((e) => e.id === selectedEventId) ?? null,
    [selectedEventId],
  )

  const filteredEvents = pendingEvents.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || event.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const steps: Step[] = STEPS_CONFIG.map((config, index) => ({
    id: config.id,
    label: config.label,
    state: getStepState(index, currentStep, stepErrors),
  }))

  const clearError = (step: number) => {
    setStepErrors((prev) => {
      const next = { ...prev }
      delete next[step]
      return next
    })
  }

  const validateStep = (step: number): boolean => {
    setStepErrors((prev) => {
      const next = { ...prev }
      delete next[step]
      return next
    })

    switch (step) {
      case 0:
        if (!selectedEvent) {
          setStepErrors((prev) => ({ ...prev, [step]: true }))
          return false
        }
        return true
      case 1:
        return true
      case 2:
        if (!selectedOption) {
          setStepErrors((prev) => ({ ...prev, [step]: true }))
          return false
        }
        return true
      case 3:
        if (!verificationNotes.trim()) {
          setStepErrors((prev) => ({ ...prev, [step]: true }))
          return false
        }
        return true
      case 4:
        return true
      default:
        return true
    }
  }

  const goNext = useCallback(() => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      }
    }
  }, [currentStep, steps.length])

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      clearError(currentStep)
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep])

  const handleStepClick = useCallback(
    (step: number) => {
      if (step < currentStep) {
        clearError(currentStep)
        setCurrentStep(step)
      }
    },
    [currentStep],
  )

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId)
    setSelectedOption("")
    setVerificationNotes("")
    setStepErrors({})
    setCurrentStep(1)
  }

  const handleVerify = () => {
    console.log({
      eventId: selectedEvent?.id,
      winningOption: selectedOption,
      notes: verificationNotes,
    })
    setShowSuccess(true)
  }

  const handleReset = () => {
    setSelectedEventId(null)
    setSelectedOption("")
    setVerificationNotes("")
    setCurrentStep(0)
    setStepErrors({})
    setShowSuccess(false)
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search events..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[130px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Politics">Politics</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {stepErrors[0] && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Please select an event to continue.</span>
              </div>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Participants</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow
                      key={event.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedEventId === event.id ? "bg-muted" : ""
                      }`}
                      onClick={() => {
                        setSelectedEventId(event.id)
                        setSelectedOption("")
                        setVerificationNotes("")
                      }}
                    >
                      <TableCell>
                        <input
                          type="radio"
                          name="event-select"
                          checked={selectedEventId === event.id}
                          onChange={() => {
                            setSelectedEventId(event.id)
                            setSelectedOption("")
                            setVerificationNotes("")
                          }}
                          className="h-4 w-4"
                          aria-label={`Select ${event.title}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>{event.category}</TableCell>
                      <TableCell>{new Date(event.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>{event.participants.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredEvents.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Search className="h-8 w-8" />
                <p>No pending events match your search.</p>
              </div>
            )}
          </div>
        )

      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>{selectedEvent?.title}</CardTitle>
              <CardDescription>
                Ended on {selectedEvent ? new Date(selectedEvent.endDate).toLocaleDateString() : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <p className="font-medium">{selectedEvent?.category}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Total Participants</span>
                  <p className="font-medium">{selectedEvent?.participants.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">End Date</span>
                  <p className="font-medium">
                    {selectedEvent ? new Date(selectedEvent.endDate).toLocaleDateString() : ""}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="secondary">Pending Verification</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Prediction Options</h3>
                <div className="space-y-2">
                  {selectedEvent?.options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <span>{option.text}</span>
                      <span className="text-sm text-muted-foreground">
                        {(option.probability * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Select Winning Outcome</CardTitle>
              <CardDescription>Choose the outcome that actually occurred.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-3 text-sm font-medium">{selectedEvent?.title}</p>
                <RadioGroup value={selectedOption} onValueChange={(v) => { setSelectedOption(v); clearError(2) }}>
                  {selectedEvent?.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2 rounded-md border p-3">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {stepErrors[2] && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Please select the winning outcome to continue.</span>
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Add Verification Notes</CardTitle>
              <CardDescription>
                Provide details, evidence, or sources supporting this outcome.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes & Evidence</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes, links to sources, or evidence for this verification..."
                  className="min-h-[120px]"
                  value={verificationNotes}
                  onChange={(e) => { setVerificationNotes(e.target.value); clearError(3) }}
                />
                <p className="text-xs text-muted-foreground">
                  This information may be displayed to users to explain the outcome.
                </p>
              </div>

              {stepErrors[3] && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Please provide verification notes to continue.</span>
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Confirm Verification</CardTitle>
              <CardDescription>Review the details before submitting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border divide-y">
                <div className="flex items-center justify-between p-3">
                  <span className="text-sm text-muted-foreground">Event</span>
                  <span className="font-medium">{selectedEvent?.title}</span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <span>{selectedEvent?.category}</span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-sm text-muted-foreground">Winning Outcome</span>
                  <span className="font-medium">
                    {selectedEvent?.options.find((o) => o.id === selectedOption)?.text}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-sm text-muted-foreground">Participants</span>
                  <span>{selectedEvent?.participants.toLocaleString()}</span>
                </div>
              </div>

              {verificationNotes.trim() && (
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Verification Notes</span>
                  <p className="rounded-md bg-muted p-3 text-sm">{verificationNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )
    }
  }

  const renderSummary = () => (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle className="h-8 w-8 text-green-500" />
      </div>
      <h2 className="text-xl font-bold">Outcome Verified Successfully</h2>
      <p className="text-muted-foreground">
        The outcome for{" "}
        <span className="font-medium text-foreground">{selectedEvent?.title}</span> has been recorded
        and payouts will be distributed.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleReset}>
          Verify Another Event
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Outcome Verification</h1>
      </div>

      {showSuccess ? (
        renderSummary()
      ) : (
        <>
          <Card>
            <CardContent className="pt-6">
              <VerificationStepper
                steps={steps}
                currentStep={currentStep}
                onStepClick={handleStepClick}
              />
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Step {currentStep + 1} of {steps.length}
            </Badge>
            {stepErrors[currentStep] && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="mr-1 h-3 w-3" />
                Validation required
              </Badge>
            )}
          </div>

          {renderStepContent()}

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goBack}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button onClick={goNext}>
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleVerify}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Confirm Verification
              </Button>
            )}
          </div>
        </>
      )}

      {!showSuccess && (
        <Tabs defaultValue="recently-verified" className="space-y-4">
          <TabsList>
            <TabsTrigger value="recently-verified" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recently Verified
            </TabsTrigger>
            <TabsTrigger value="all-pending" className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              All Pending Events
              <Badge variant="secondary" className="ml-1">
                {pendingEvents.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recently-verified" className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Verified Date</TableHead>
                    <TableHead>Winning Option</TableHead>
                    <TableHead>Verified By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifiedEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>{event.category}</TableCell>
                      <TableCell>{new Date(event.verifiedDate).toLocaleDateString()}</TableCell>
                      <TableCell>{event.winningOption}</TableCell>
                      <TableCell>{event.verifiedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="all-pending" className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Participants</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>{event.category}</TableCell>
                      <TableCell>{new Date(event.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>{event.participants.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
