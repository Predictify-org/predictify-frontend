# Toast queue

StreamPay exposes a centralized toast notification system for transient,
non-blocking status messages across the app.

## Setup

`ToastProvider` is mounted in `app/layout.tsx`. Wrap is global — no extra
setup is required in route files.

## Usage

```tsx
"use client";

import { useToast } from "@/app/hooks/useToast";

export function SaveButton() {
  const { success, error, toast, dismiss } = useToast();

  const handleSave = async () => {
    try {
      await save();
      success("Changes saved.");
    } catch {
      error("Could not save changes.");
    }
  };

  return <button type="button" onClick={handleSave}>Save</button>;
}
```

### API

| Method | Description |
|--------|-------------|
| `toast(input)` | Enqueue a toast. Accepts a message string or `{ message, title?, severity?, duration?, action? }`. Returns toast id. |
| `success(message, options?)` | Shorthand for success severity. |
| `error(message, options?)` | Shorthand for error severity. |
| `warning(message, options?)` | Shorthand for warning severity. |
| `info(message, options?)` | Shorthand for info severity. |
| `dismiss(id)` | Remove a toast by id. |
| `dismissAll()` | Clear the queue. |

### Queue behavior

- Up to **5** toasts are visible at once; additional toasts wait in the queue.
- Default auto-dismiss is **5 seconds**; pass `duration: 0` to persist until dismissed.
- Optional `action` buttons dismiss the toast after running their handler.

## Accessibility

Each toast renders with:

- `role="status"`
- `aria-live="polite"`
- `aria-atomic="true"`

Severity icons are decorative (`aria-hidden="true"`). Message text is exposed
in the status region for screen readers.

## Related components

`ErrorToast` remains available for inline stream error recovery flows that
need retry actions tied to `StreamPayError` objects. Prefer `useToast` for
general app feedback.
