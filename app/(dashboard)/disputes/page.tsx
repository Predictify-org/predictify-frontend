"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle, Filter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// Mock data for disputes
const disputes = [
  {
    id: "1",
    eventId: "101",
    eventTitle: "Super Bowl Winner 2023",
    category: "Sports",
    submittedBy: "user123@example.com",
    submittedDate: "2023-02-13",
    reason: "The game went into overtime and the final result was incorrectly recorded.",
    status: "pending",
    priority: "high",
    evidence: "https://example.com/evidence1.pdf",
  },
  {
    id: "2",
    eventId: "102",
    eventTitle: "Oscar Best Picture 2023",
    category: "Entertainment",
    submittedBy: "user456@example.com",
    submittedDate: "2023-03-13",
    reason: "The announced winner doesn't match the official Academy Awards results.",
    status: "pending",
    priority: "medium",
    evidence: "https://example.com/evidence2.pdf",
  },
  {
    id: "3",
    eventId: "103",
    eventTitle: "Bitcoin Price on Jan 1, 2023",
    category: "Finance",
    submittedBy: "user789@example.com",
    submittedDate: "2023-01-02",
    reason: "The price used for verification was from the wrong exchange.",
    status: "pending",
    priority: "low",
    evidence: "https://example.com/evidence3.pdf",
  },
  {
    id: "4",
    eventId: "104",
    eventTitle: "UK Prime Minister by End of 2022",
    category: "Politics",
    submittedBy: "user101@example.com",
    submittedDate: "2023-01-01",
    reason: "The verification didn't account for the interim appointment.",
    status: "pending",
    priority: "high",
    evidence: "https://example.com/evidence4.pdf",
  },
]

// Mock data for resolved disputes
const resolvedDisputes = [
  {
    id: "5",
    eventId: "105",
    eventTitle: "French Open Men's Singles Winner 2023",
    category: "Sports",
    submittedBy: "user202@example.com",
    resolvedDate: "2023-06-12",
    resolution: "upheld",
    resolvedBy: "admin@example.com",
    notes: "Evidence confirmed that the initial verification was incorrect. Results updated.",
  },
  {
    id: "6",
    eventId: "106",
    eventTitle: "Eurovision Winner 2023",
    category: "Entertainment",
    submittedBy: "user303@example.com",
    resolvedDate: "2023-05-14",
    resolution: "rejected",
    resolvedBy: "admin@example.com",
    notes: "Official results confirm the original verification was correct.",
  },
]

export default function DisputesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [resolution, setResolution] = useState("")
  const [resolutionNotes, setResolutionNotes] = useState("")

  // Filter disputes based on search query and filters
  const filteredDisputes = disputes.filter((dispute) => {
    const matchesSearch = dispute.eventTitle.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || dispute.status === statusFilter
    const matchesPriority = priorityFilter === "all" || dispute.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-500">High</Badge>
      case "medium":
        return <Badge className="bg-amber-500">Medium</Badge>
      case "low":
        return <Badge className="bg-green-500">Low</Badge>
      default:
        return <Badge>{priority}</Badge>
    }
  }

  const handleResolve = () => {
    // In a real app, you would send this data to your API
    console.log({
      disputeId: selectedDispute.id,
      resolution,
      notes: resolutionNotes,
    })

    // Reset the form
    setSelectedDispute(null)
    setResolution("")
    setResolutionNotes("")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dispute Resolution</h1>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Pending Disputes
            <Badge variant="secondary" className="ml-1">
              {disputes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Resolved Disputes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search disputes..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[130px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDisputes.map((dispute) => (
                  <TableRow key={dispute.id}>
                    <TableCell className="font-medium">{dispute.eventTitle}</TableCell>
                    <TableCell>{dispute.submittedBy}</TableCell>
                    <TableCell>{new Date(dispute.submittedDate).toLocaleDateString()}</TableCell>
                    <TableCell>{getPriorityBadge(dispute.priority)}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" onClick={() => setSelectedDispute(dispute)}>
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Review Dispute</DialogTitle>
                            <DialogDescription>Review the dispute details and provide a resolution.</DialogDescription>
                          </DialogHeader>

                          {selectedDispute && (
                            <div className="space-y-4 py-4">
                              <div>
                                <h3 className="font-medium">{selectedDispute.eventTitle}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Submitted on {new Date(selectedDispute.submittedDate).toLocaleDateString()} by{" "}
                                  {selectedDispute.submittedBy}
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label>Dispute Reason</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">{selectedDispute.reason}</div>
                              </div>

                              <div className="space-y-2">
                                <Label>Evidence</Label>
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={selectedDispute.evidence} target="_blank" rel="noopener noreferrer">
                                      View Evidence
                                    </a>
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Resolution</Label>
                                <RadioGroup value={resolution} onValueChange={setResolution}>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="upheld" id="upheld" />
                                    <Label htmlFor="upheld">Uphold Dispute (Change Outcome)</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="rejected" id="rejected" />
                                    <Label htmlFor="rejected">Reject Dispute (Keep Original Outcome)</Label>
                                  </div>
                                </RadioGroup>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="notes">Resolution Notes</Label>
                                <Textarea
                                  id="notes"
                                  placeholder="Explain your decision"
                                  value={resolutionNotes}
                                  onChange={(e) => setResolutionNotes(e.target.value)}
                                />
                              </div>
                            </div>
                          )}

                          <DialogFooter>
                            <Button type="button" onClick={handleResolve}>
                              Submit Resolution
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Resolved Date</TableHead>
                  <TableHead>Resolution</TableHead>
                  <TableHead>Resolved By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolvedDisputes.map((dispute) => (
                  <TableRow key={dispute.id}>
                    <TableCell className="font-medium">{dispute.eventTitle}</TableCell>
                    <TableCell>{dispute.submittedBy}</TableCell>
                    <TableCell>{new Date(dispute.resolvedDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {dispute.resolution === "upheld" ? (
                        <Badge className="bg-green-500">Upheld</Badge>
                      ) : (
                        <Badge className="bg-red-500">Rejected</Badge>
                      )}
                    </TableCell>
                    <TableCell>{dispute.resolvedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

