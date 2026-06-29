# Quiet Hours

Quiet hours are stored in `localStorage` as `predictify_quiet_hours`:

```json
{ "start": "22:00", "end": "08:00", "tz": "auto" }
```

The `lib/quiet-hours.ts` helper normalizes stored values, handles windows that cross midnight, and reevaluates against the browser's current timezone when `tz` is `auto`. Using local `Date` values keeps daylight saving time and device timezone changes aligned with the user setting.

During an active window, non-critical Radix and Sonner toasts are suppressed. Critical toasts still surface when they use `severity: "critical"`, `severity: "warning"`, the Radix `destructive` variant, or Sonner `error`/`warning` methods. This keeps wallet errors, claim failures, disputes, and other actionable warnings visible.

The global `quiet-hours-active` class pauses ambient CSS animations and transitions. The navbar theme button shows a small indicator while quiet hours are active.
