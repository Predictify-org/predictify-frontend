"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

export default function NewEventPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [deadline, setDeadline] = useState(null)
  const [options, setOptions] = useState([{ text: "", probability: "" }])
  const [newOption, setNewOption] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [featuredEvent, setFeaturedEvent] = useState(false)

  const addOption = () => {
    if (newOption.trim() !== "") {
      setOptions([...options, { text: newOption, probability: "" }])
      setNewOption("")
    }
  }

  const removeOption = (index) => {
    const updatedOptions = [...options]
    updatedOptions.splice(index, 1)
    setOptions(updatedOptions)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // In a real app, you would send this data to your API
    console.log({
      title,
      description,
      category,
      deadline,
      options,
      isPublic,
      featuredEvent,
    })

    // Redirect back to events page
    router.push("/events")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Create New Prediction Event</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                placeholder="Enter event title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the prediction event"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px]"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Politics">Politics</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" id="deadline">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadline ? format(deadline, "PPP") : "Select deadline"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus />
                  </PopoverContent>
                </Popover>
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
              <p className="text-sm text-muted-foreground mb-4">Add the possible outcomes for this prediction event</p>

              <Card>
                <CardContent className="p-4 space-y-4">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option.text}
                        onChange={(e) => {
                          const updatedOptions = [...options]
                          updatedOptions[index].text = e.target.value
                          setOptions(updatedOptions)
                        }}
                        className="flex-1"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add new option"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addOption}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

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

        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/events")}>
            Cancel
          </Button>
          <Button type="submit">Create Event</Button>
        </div>
      </form>
    </div>
  )
}

