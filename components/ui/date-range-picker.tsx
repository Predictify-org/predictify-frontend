"use client"

import * as React from "react"
import { Calendar } from "lucide-react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DateRangePickerProps {
  /**
   * The selected date range
   */
  date?: DateRange
  /**
   * Callback when date range changes
   */
  onDateChange?: (date: DateRange | undefined) => void
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Placeholder text when no date is selected
   */
  placeholder?: string
  /**
   * Whether the picker is disabled
   */
  disabled?: boolean
}

export function DateRangePicker({
  date,
  onDateChange,
  className,
  placeholder = "Pick a date range",
  disabled = false,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="flex items-center bg-white">
            {/* From Date */}
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-center text-center font-normal border-gray-200 rounded-r-none",
                !date?.from && "text-gray-500"
              )}
              disabled={disabled}
            >
              <Calendar className="mr-2 h-4 w-4 text-gray-500" />
              {date?.from ? format(date.from, "dd-MM-yyyy") : "29-03-2025"}
            </Button>
            
            {/* To Label */}
            <div className="px-3 py-2 border-t border-b border-gray-200 bg-gray-50 text-gray-500 text-sm font-medium flex items-center">
              To
            </div>
            
            {/* To Date */}
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-center text-center font-normal border-gray-200 rounded-l-none border-l-0",
                !date?.to && "text-gray-500"
              )}
              disabled={disabled}
            >
              <Calendar className="mr-2 h-4 w-4 text-gray-500" />
              {date?.to ? format(date.to, "dd-MM-yyyy") : "29-12-2025"}
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(newDate) => {
              onDateChange?.(newDate)
              // Close popover when both dates are selected
              if (newDate?.from && newDate?.to) {
                setIsOpen(false)
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}