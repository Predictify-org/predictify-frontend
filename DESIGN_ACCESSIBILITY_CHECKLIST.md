# Screen Accessibility Checklist

Use this checklist during design review and PR review for any frontend screen change. The goal is to catch screen-level regressions quickly before they reach QA.

Scope: frontend design only.
Timeframe: apply this checklist to any screen touched in the last 96 hours before merging.

## How To Review

- Review the changed screen at desktop and mobile widths.
- Tab through the main interactive path once with a keyboard.
- Check one normal state and one stressed state such as empty, error, loading, or success.
- Compare the PR screenshots against the checklist below instead of relying on memory.

## 1. Screen Frame And Navigation

- [ ] The page has one clear screen title that matches the main task.
- [ ] Landmark content is visually grouped so users can tell header, body, side panel, and footer apart.
- [ ] Repeated navigation does not visually overpower the primary task.
- [ ] Sticky headers, drawers, modals, and sheets do not cover the focused element or critical messaging.
- [ ] Dense dashboards still preserve a readable scan order from top-left to bottom-right.

Passing pattern: a settings screen shows one page title, grouped cards with clear section headings, and sticky controls that do not cover active fields.

Failing pattern: a modal opens over the page but hides the confirmation button or page-level error banner behind it.

## 2. Text And Contrast

- [ ] Body text, labels, helper text, and badges remain readable against their background in all supported themes.
- [ ] Muted text is still readable for essential information such as deadlines, helper copy, and table metadata.
- [ ] Status colors are supported by text or icon meaning and not color alone.
- [ ] Disabled controls are still legible enough to explain what is unavailable.
- [ ] Placeholder text is never the only place where critical instructions live.

Passing pattern: "3 high priority disputes" uses an icon plus text, and helper text is still readable without zooming.

Failing pattern: an error is shown only by red border color, or a low-contrast gray label disappears on card backgrounds.

## 3. Forms, Labels, And Instructions

- [ ] Every input, select, switch, checkbox, radio group, date picker, and textarea has a visible label.
- [ ] Required fields are identified consistently and do not rely on placeholder text alone.
- [ ] Helper text appears next to the field it explains, not in a separate paragraph far away.
- [ ] Compound controls such as option builders, filter bars, and date pickers include enough visible context to understand the expected value.
- [ ] Icon-only buttons inside forms have an adjacent text label, tooltip, or visible group heading that explains the action.

Passing pattern: "Platform Fee (%)" has a visible label, a numeric input, and helper text directly below describing the allowed range.

Failing pattern: an "Add" icon button appears next to an input with no nearby text clarifying whether it adds a row, saves the value, or opens a picker.

## 4. Errors, Validation, And Status Messaging

- [ ] Validation messages say what went wrong and what to do next.
- [ ] Error copy is placed near the affected field or task, not only in a global toast.
- [ ] Success, warning, and destructive states use distinct language and visual treatment.
- [ ] Time-sensitive actions explain deadlines, retries, or irreversible outcomes in plain language.
- [ ] Empty, loading, and no-results states still guide the next action.

Passing pattern: "Invalid email or password" appears above the login form, and a field-level message explains missing required data when relevant.

Failing pattern: a save action closes the form with no visible success feedback, or a destructive state uses the same styling as an informational note.

## 5. Interactive Controls And Focus

- [ ] Every interactive element has a visible focus state that stands out from hover and selected states.
- [ ] Focus order follows the visual layout and does not jump into hidden panels or disabled controls.
- [ ] Tabs, accordions, drawers, and popovers show which item is active and which item currently has keyboard focus.
- [ ] Click targets are large enough for touch use, especially icon buttons, switches, pagination, and row actions.
- [ ] Keyboard users can reach all primary actions without getting trapped in widgets.

Passing pattern: tabbing through a new-event form moves from title to description to category to deadline to visibility controls in a predictable order.

Failing pattern: focus disappears on a ghost icon button, or tab focus enters a hidden tab panel before the visible Save button.

## 6. Motion And State Changes

- [ ] Animation supports understanding and does not delay task completion.
- [ ] Important content does not slide, pulse, or autoplay in a way that competes with form entry.
- [ ] Loading states preserve layout so content does not jump when data appears.
- [ ] Hover-only motion is not required to discover actions.
- [ ] Reduced-motion behavior is defined for page transitions, chart animation, counters, and decorative backgrounds.

Passing pattern: a loading skeleton holds card height in place and the final content fades in without shifting buttons away from the pointer.

Failing pattern: success banners auto-dismiss before the user can read them, or animated counters rapidly change values with no reduced-motion fallback.

## Component-Type Spot Checks

### Forms And Authentication Screens

- [ ] Labels remain visible while typing.
- [ ] Password, OTP, and email fields expose errors near the field and at form level when needed.
- [ ] Secondary actions such as "Forgot password?" remain visually subordinate to the primary submit action.

### Data-Dense Dashboard Screens

- [ ] KPI cards, charts, and status rows have readable labels and do not rely on color-only meaning.
- [ ] Badge, icon, and trend treatments remain understandable for color-blind users.
- [ ] Table or card actions are discoverable by keyboard and touch, not just hover.

### Settings, Preferences, And Admin Panels

- [ ] Switches clearly describe what turns on or off and what changes immediately.
- [ ] Grouped controls use headings or separators that make the hierarchy obvious.
- [ ] Success and error feedback remains visible long enough to review.

### Overlays, Popovers, Drawers, And Modals

- [ ] The trigger, title, body, and primary action are all visible without accidental clipping.
- [ ] Focus stays inside the active overlay until it is dismissed.
- [ ] Background content is visually de-emphasized but still stable when the overlay closes.

## Minimum Screenshots Required In PR Review

For any design or UI PR, include at least these screenshots in the PR description:

- 1 desktop screenshot of the changed screen in its default state.
- 1 mobile screenshot of the same screen or flow.
- 1 screenshot of a stressed state: error, empty, loading, success, validation, open menu, or open modal.

If the PR changes focus behavior, overlays, or motion, also include:

- 1 screenshot showing keyboard focus visibility on the primary interactive element.
- 1 screenshot of any modal, drawer, popover, select, or date picker while open.

## Validation Against Existing Screens

Use these checks as examples during review.

### `app/(auth)/login`

- Pass: visible labels for email and password, inline destructive alert for failed login, clear primary action.
- Risk to watch: the alert is page-level only, so field-specific validation should not be added later without nearby messaging.

### `app/(dashboard)/settings`

- Pass: most inputs and switches have visible labels and helper text, sections are grouped with headings and separators.
- Risk to watch: success feedback auto-clears after 3 seconds, which is easy to miss for slower readers.
- Risk to watch: tabbed settings UIs need visible focus treatment and clear active-state contrast during review.

### `app/(dashboard)/events/new`

- Pass: main fields are labeled, preview helps confirm content before submit, primary and secondary actions are separated.
- Risk to watch: icon-only add and remove buttons need strong visible focus and clear accessible intent in design review.
- Risk to watch: deadline picker, category select, and dynamic option rows should be checked for keyboard order and overlay clipping.
