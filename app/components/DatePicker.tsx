"use client"

/**
 * DatePicker
 * ==========
 *
 * An accessible, custom-styled replacement for the native
 * `<input type="date">` / `<input type="date">` + `<input type="date">`
 * range-filter pattern used across the app (see issue #455).
 *
 * Why not the native picker?
 * ---------------------------
 * The native date input's calendar affordance is rendered by the browser /
 * OS and can't be restyled, doesn't respect our design tokens or dark mode,
 * and its accessibility + keyboard behaviour is inconsistent across
 * browsers (notably Firefox vs. Chromium vs. Safari, and effectively absent
 * on some mobile browsers). This component gives us one consistent,
 * themeable, fully keyboard- and screen-reader-accessible implementation.
 *
 * Accessibility approach
 * -----------------------
 * This follows the WAI-ARIA Authoring Practices "Date Picker Dialog"
 * pattern (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/):
 *
 *  - A visible, labelled text field lets users type a date directly
 *    (format is shown as a hint and enforced on blur / Enter).
 *  - A separate icon button (`aria-haspopup="dialog"`) opens a calendar
 *    dialog. The calendar grid comes from `react-day-picker`, which
 *    implements the ARIA "grid" pattern (roving tabindex, Arrow key
 *    navigation, Home/End/PageUp/PageDown, etc.) out of the box.
 *  - The popover is a real `role="dialog"` with `aria-modal="false"`
 *    (it's non-modal so the text input remains reachable) and
 *    `aria-label`.
 *  - Escape closes the popover and returns focus to the trigger button.
 *  - Selecting a date closes the popover, updates the field, and moves
 *    focus back to the trigger button.
 *  - An `aria-live="polite"` region announces the selected date (or
 *    range) for screen reader users after every change, independent of
 *    focus movement.
 *  - Invalid / out-of-range typed input is surfaced via `aria-invalid`
 *    plus a `role="alert"` message tied to the field with
 *    `aria-describedby`, never colour alone.
 *
 * Supports two modes:
 *  - `mode="single"` (default): picks a single `Date`.
 *  - `mode="range"`: picks a `{ from, to }` range (two calendar months,
 *    one field pair for "from" / "to").
 */

import * as React from "react"
import { CalendarIcon, AlertCircle } from "lucide-react"
import { format, parse, isValid, isBefore, isAfter, startOfDay } from "date-fns"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/** Default text-entry format. Matches the hint shown to the user. */
const DEFAULT_DATE_FORMAT = "yyyy-MM-dd"

interface DatePickerBaseProps {
  /** Element id for the text input. Auto-generated when omitted. */
  id?: string
  /** Visible / accessible label for the field. */
  label?: string
  /** Hides the visible label while keeping it for screen readers. */
  hideLabel?: boolean
  /** Placeholder shown in the empty text field. */
  placeholder?: string
  /** date-fns format string used for typed input and display. */
  dateFormat?: string
  /** Disables the whole control. */
  disabled?: boolean
  /** Earliest selectable date (inclusive). */
  minDate?: Date
  /** Latest selectable date (inclusive). */
  maxDate?: Date
  /** Additional dates (or predicate) to disable, on top of min/max. */
  disabledDates?: Date[] | ((date: Date) => boolean)
  /** Additional class names for the outer wrapper. */
  className?: string
  /** Marks the field as required for assistive tech + styling. */
  required?: boolean
}

interface SingleDatePickerProps extends DatePickerBaseProps {
  mode?: "single"
  /** Selected date, or `null` / `undefined` when empty. */
  value?: Date | null
  /** Called with the new date, or `null` when cleared / invalid-cleared. */
  onChange?: (date: Date | null) => void
}

interface RangeDatePickerProps extends DatePickerBaseProps {
  mode: "range"
  /** Selected range. */
  value?: DateRange
  /** Called with the new range. */
  onChange?: (range: DateRange | undefined) => void
  /** Label for the "from" field (range mode only). */
  fromLabel?: string
  /** Label for the "to" field (range mode only). */
  toLabel?: string
}

export type DatePickerProps = SingleDatePickerProps | RangeDatePickerProps

function isRangeProps(props: DatePickerProps): props is RangeDatePickerProps {
  return props.mode === "range"
}

function isDateDisabled(
  date: Date,
  { minDate, maxDate, disabledDates }: Pick<DatePickerBaseProps, "minDate" | "maxDate" | "disabledDates">
): boolean {
  const day = startOfDay(date)
  if (minDate && isBefore(day, startOfDay(minDate))) return true
  if (maxDate && isAfter(day, startOfDay(maxDate))) return true
  if (typeof disabledDates === "function") return disabledDates(day)
  if (Array.isArray(disabledDates)) {
    return disabledDates.some((d) => startOfDay(d).getTime() === day.getTime())
  }
  return false
}

/** Parses free-typed text into a Date, validating both syntax and range. */
function parseTypedDate(
  text: string,
  dateFormat: string,
  constraints: Pick<DatePickerBaseProps, "minDate" | "maxDate" | "disabledDates">
): { date: Date | null; error: string | null } {
  if (!text.trim()) return { date: null, error: null }

  const parsed = parse(text.trim(), dateFormat, new Date())
  if (!isValid(parsed)) {
    return { date: null, error: `Enter a date as ${dateFormat.toLowerCase()}` }
  }
  if (isDateDisabled(parsed, constraints)) {
    return { date: null, error: "That date isn't available" }
  }
  return { date: parsed, error: null }
}

/**
 * A single accessible date field: text input + calendar-dialog trigger.
 * Used directly for `mode="single"`, and twice internally for
 * `mode="range"` (from / to).
 */
function DateField({
  id,
  label,
  hideLabel,
  placeholder,
  dateFormat,
  disabled,
  required,
  value,
  onValueChange,
  minDate,
  maxDate,
  disabledDates,
  rangeSelectProps,
}: {
  id: string
  label: string
  hideLabel?: boolean
  placeholder: string
  dateFormat: string
  disabled?: boolean
  required?: boolean
  value: Date | null
  onValueChange: (date: Date | null) => void
  minDate?: Date
  maxDate?: Date
  disabledDates?: Date[] | ((date: Date) => boolean)
  /** When set, renders a range calendar instead of a single-date one. */
  rangeSelectProps?: {
    selected: DateRange | undefined
    onSelect: (range: DateRange | undefined) => void
    defaultMonth?: Date
  }
}) {
  const reactId = React.useId()
  const fieldId = id || reactId
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`
  const constraints = { minDate, maxDate, disabledDates }

  const [open, setOpen] = React.useState(false)
  const [text, setText] = React.useState(value ? format(value, dateFormat) : "")
  const [error, setError] = React.useState<string | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  // Keep the text field in sync when the value changes externally
  // (e.g. selected from the calendar, or the parent resets it).
  React.useEffect(() => {
    setText(value ? format(value, dateFormat) : "")
    setError(null)
  }, [value, dateFormat])

  const commitText = (raw: string) => {
    const { date, error: parseError } = parseTypedDate(raw, dateFormat, constraints)
    setError(parseError)
    if (!parseError) {
      onValueChange(date)
    }
  }

  const handleSelect = (date: Date | undefined) => {
    onValueChange(date ?? null)
    setError(null)
    setOpen(false)
    // Return focus to the trigger button, per the APG dialog pattern.
    triggerRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={fieldId}
        className={cn(
          "text-sm font-medium leading-none text-foreground",
          hideLabel && "sr-only"
        )}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-destructive">
            *
          </span>
        )}
      </label>

      <div className="relative flex items-stretch">
        <input
          id={fieldId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? `${fieldId}-dialog` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, error ? errorId : null].filter(Boolean).join(" ")}
          aria-required={required || undefined}
          placeholder={placeholder}
          disabled={disabled}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commitText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commitText(text)
            } else if (e.key === "ArrowDown" && !open) {
              e.preventDefault()
              setOpen(true)
            }
          }}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive"
          )}
        />

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={triggerRef}
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label={`Choose date${label ? ` for ${label}` : ""}`}
              className="absolute right-0 top-0 h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
            >
              <CalendarIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            id={`${fieldId}-dialog`}
            role="dialog"
            aria-modal="false"
            aria-label={`${label} calendar`}
            className="w-auto p-0"
            align="start"
            onCloseAutoFocus={(e) => {
              // We manage focus ourselves in handleSelect so it lands on
              // the trigger even when closed via day-selection rather
              // than Escape/outside-click.
              e.preventDefault()
              triggerRef.current?.focus()
            }}
          >
            {rangeSelectProps ? (
              <Calendar
                mode="range"
                initialFocus
                defaultMonth={rangeSelectProps.defaultMonth}
                selected={rangeSelectProps.selected}
                onSelect={(range) => {
                  rangeSelectProps.onSelect(range)
                  if (range?.from && range?.to) {
                    setOpen(false)
                    triggerRef.current?.focus()
                  }
                }}
                numberOfMonths={2}
                disabled={(date) => isDateDisabled(date, constraints)}
              />
            ) : (
              <Calendar
                mode="single"
                initialFocus
                selected={value ?? undefined}
                defaultMonth={value ?? undefined}
                onSelect={handleSelect}
                disabled={(date) => isDateDisabled(date, constraints)}
              />
            )}
          </PopoverContent>
        </Popover>
      </div>

      <span id={hintId} className="text-xs text-muted-foreground">
        Format: {dateFormat.toLowerCase()}
      </span>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1 text-xs text-destructive"
        >
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

export function DatePicker(props: DatePickerProps) {
  const {
    id,
    hideLabel,
    placeholder,
    dateFormat = DEFAULT_DATE_FORMAT,
    disabled,
    minDate,
    maxDate,
    disabledDates,
    className,
    required,
  } = props

  const liveRegionRef = React.useRef<HTMLDivElement>(null)
  const announce = React.useCallback((message: string) => {
    if (liveRegionRef.current) liveRegionRef.current.textContent = message
  }, [])

  if (isRangeProps(props)) {
    const { value, onChange, label = "Date range", fromLabel = "From", toLabel = "To" } = props

    const handleFromChange = (date: Date | null) => {
      const next: DateRange | undefined = date
        ? { from: date, to: value?.to }
        : value?.to
          ? { from: undefined, to: value.to }
          : undefined
      onChange?.(next)
      announce(
        next?.from && next?.to
          ? `Date range selected: ${format(next.from, dateFormat)} to ${format(next.to, dateFormat)}`
          : next?.from
            ? `Start date selected: ${format(next.from, dateFormat)}`
            : "Start date cleared"
      )
    }

    const handleToChange = (date: Date | null) => {
      const next: DateRange | undefined = date
        ? { from: value?.from, to: date }
        : value?.from
          ? { from: value.from, to: undefined }
          : undefined
      onChange?.(next)
      announce(
        next?.from && next?.to
          ? `Date range selected: ${format(next.from, dateFormat)} to ${format(next.to, dateFormat)}`
          : next?.to
            ? `End date selected: ${format(next.to, dateFormat)}`
            : "End date cleared"
      )
    }

    return (
      <fieldset className={cn("flex flex-col gap-3 sm:flex-row sm:items-start", className)}>
        <legend className={cn("sr-only", !hideLabel && "not-sr-only mb-1 text-sm font-medium text-foreground")}>
          {label}
        </legend>
        <DateField
          id={id ? `${id}-from` : ""}
          label={fromLabel}
          hideLabel={hideLabel}
          placeholder={placeholder ?? dateFormat.toLowerCase()}
          dateFormat={dateFormat}
          disabled={disabled}
          required={required}
          value={value?.from ?? null}
          onValueChange={handleFromChange}
          minDate={minDate}
          maxDate={maxDate}
          disabledDates={disabledDates}
          rangeSelectProps={{
            selected: value,
            onSelect: (r) => {
              onChange?.(r)
              if (r?.from && r?.to) {
                announce(`Date range selected: ${format(r.from, dateFormat)} to ${format(r.to, dateFormat)}`)
              }
            },
            defaultMonth: value?.from,
          }}
        />
        <DateField
          id={id ? `${id}-to` : ""}
          label={toLabel}
          hideLabel={hideLabel}
          placeholder={placeholder ?? dateFormat.toLowerCase()}
          dateFormat={dateFormat}
          disabled={disabled}
          required={required}
          value={value?.to ?? null}
          onValueChange={handleToChange}
          minDate={minDate}
          maxDate={maxDate}
          disabledDates={disabledDates}
          rangeSelectProps={{
            selected: value,
            onSelect: (r) => {
              onChange?.(r)
              if (r?.from && r?.to) {
                announce(`Date range selected: ${format(r.from, dateFormat)} to ${format(r.to, dateFormat)}`)
              }
            },
            defaultMonth: value?.to ?? value?.from,
          }}
        />
        <div aria-live="polite" className="sr-only" ref={liveRegionRef} />
      </fieldset>
    )
  }

  const { value, onChange, label = "Date" } = props

  return (
    <div className={className}>
      <DateField
        id={id ?? ""}
        label={label}
        hideLabel={hideLabel}
        placeholder={placeholder ?? dateFormat.toLowerCase()}
        dateFormat={dateFormat}
        disabled={disabled}
        required={required}
        value={value ?? null}
        onValueChange={(date) => {
          onChange?.(date)
          announce(date ? `Date selected: ${format(date, dateFormat)}` : "Date cleared")
        }}
        minDate={minDate}
        maxDate={maxDate}
        disabledDates={disabledDates}
      />
      <div aria-live="polite" className="sr-only" ref={liveRegionRef} />
    </div>
  )
}

DatePicker.displayName = "DatePicker"
