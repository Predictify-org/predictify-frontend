"use client"

import { useState } from "react"
import { CheckCircle, Clock, Filter, Search } from "lucide-react"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"

// Mock data for events needing verification
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

// Mock data for recently verified events
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

export default function VerificationPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedOption, setSelectedOption] = useState("")
  const [verificationNotes, setVerificationNotes] = useState("")

  // Filter events based on search query and filters
  const filteredEvents = pendingEvents.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || event.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const handleVerify = () => {
    // In a real app, you would send this data to your API
    console.log({
      eventId: selectedEvent.id,
      winningOption: selectedOption,
      notes: verificationNotes,
    })

    // Reset the form
    setSelectedEvent(null)
    setSelectedOption("")
    setVerificationNotes("")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Outcome Verification</h1>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Verification
            <Badge variant="secondary" className="ml-1">
              {pendingEvents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="verified" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Recently Verified
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
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
              <div className="flex items-center gap-2">
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
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>{event.category}</TableCell>
                    <TableCell>{new Date(event.endDate).toLocaleDateString()}</TableCell>
                    <TableCell>{event.participants.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" onClick={() => setSelectedEvent(event)}>
                            Verify
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Verify Outcome</DialogTitle>
                            <DialogDescription>Select the winning option for this prediction event.</DialogDescription>
                          </DialogHeader>

                          {selectedEvent && (
                            <div className="space-y-4 py-4">
                              <div>
                                <h3 className="font-medium">{selectedEvent.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Ended on {new Date(selectedEvent.endDate).toLocaleDateString()}
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label>Select Winning Option</Label>
                                <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
                                  {selectedEvent.options.map((option) => (
                                    <div key={option.id} className="flex items-center space-x-2">
                                      <RadioGroupItem value={option.id} id={option.id} />
                                      <Label htmlFor={option.id}>{option.text}</Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="notes">Verification Notes</Label>
                                <Textarea
                                  id="notes"
                                  placeholder="Add any notes about this verification"
                                  value={verificationNotes}
                                  onChange={(e) => setVerificationNotes(e.target.value)}
                                />
                              </div>
                            </div>
                          )}

                          <DialogFooter>
                            <Button type="button" onClick={handleVerify}>
                              Confirm Verification
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

        <TabsContent value="verified" className="space-y-4">
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
      </Tabs>
    </div>
  )
}

