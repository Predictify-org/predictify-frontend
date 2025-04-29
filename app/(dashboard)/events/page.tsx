"use client"

import { useState } from "react"
import Link from "next/link"
import { Calendar, ChevronDown, Edit, Eye, Filter, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react"; // Ensure Eye is imported
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Mock data for prediction events
const events = [
  {
    id: "1",
    title: "Super Bowl Winner 2024",
    category: "Sports",
    status: "active",
    deadline: "2024-02-11",
    options: ["Kansas City Chiefs", "San Francisco 49ers"],
    participants: 1245,
  },
  {
    id: "2",
    title: "Bitcoin Price on July 1st",
    category: "Finance",
    status: "active",
    deadline: "2024-07-01",
    options: ["Above $50,000", "Below $50,000"],
    participants: 876,
  },
  {
    id: "3",
    title: "Oscar Best Picture Winner",
    category: "Entertainment",
    status: "completed",
    deadline: "2024-03-10",
    options: ["Oppenheimer", "Barbie", "Poor Things", "Killers of the Flower Moon"],
    participants: 2341,
  },
  {
    id: "4",
    title: "US Presidential Election 2024",
    category: "Politics",
    status: "active",
    deadline: "2024-11-05",
    options: ["Democratic Candidate", "Republican Candidate", "Other"],
    participants: 5432,
  },
  {
    id: "5",
    title: "Next iPhone Release Date",
    category: "Technology",
    status: "pending",
    deadline: "2024-09-30",
    options: ["September 2024", "October 2024", "Later"],
    participants: 654,
  },
]

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  // Filter events based on search query and filters
  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || event.status === statusFilter
    const matchesCategory = categoryFilter === "all" || event.category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
      case "completed":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Completed</Badge>
      case "pending":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Pending</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Prediction Events</h1>

        <div className="flex gap-2">
          <Button asChild>
            <Link href="/events/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Event
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/events/event-page">
              <Plus className="mr-2 h-4 w-4" />
              Create Track Bet
            </Link>
          </Button>
        </div>
      </div>


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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[130px]">
                <ChevronDown className="mr-2 h-4 w-4" />
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
              <TableHead>Status</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>{event.category}</TableCell>
                  <TableCell>{getStatusBadge(event.status)}</TableCell>
                  <TableCell>{new Date(event.deadline).toLocaleDateString()}</TableCell>
                  <TableCell>{event.participants.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu for {event.title}</span> 
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/events/${event.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> 
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/events/${event.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Event
                          </Link>
                        </DropdownMenuItem>
                        <Dialog>
                          <DialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Calendar className="mr-2 h-4 w-4" />
                              Manage Options
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Prediction Options for "{event.title}"</DialogTitle>
                              <DialogDescription>
                                View and manage the options for this prediction event.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <h4 className="font-medium">Current Options:</h4>
                              {event.options.length > 0 ? (
                                <ul className="space-y-2">
                                  {event.options.map((option, index) => (
                                    <li key={index} className="flex items-center justify-between rounded-md border p-2">
                                      <span>{option}</span>
                                      <Button variant="ghost" size="icon" disabled> 
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Edit option {option}</span>
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-muted-foreground">No options defined yet.</p>
                              )}
                            </div>
                            <DialogFooter>
                              <Button type="button" variant="outline" disabled> 
                                Add Option
                              </Button>
                              <Button type="button" disabled>Save Changes</Button> 
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-red-600 hover:bg-red-100 focus:bg-red-100 focus:text-red-700" // Enhanced styling
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Event
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the event
                                <span className="font-semibold"> "{event.title}"</span> and all associated predictions.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => console.log(`Deleting event ${event.id}`)} // Placeholder action
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No events found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
