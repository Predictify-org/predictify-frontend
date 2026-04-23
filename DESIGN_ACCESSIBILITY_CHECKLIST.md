# Screen Accessibility Checklist

Use this checklist during design review and PR review for any frontend screen change. The goal is to catch screen-level regressions quickly before they reach QA.

Scope: frontend design only.
Timeframe: apply this checklist to any screen touched in the last 96 hours before merging.

## How To Review

- Review the changed screen at desktop and mobile widths.
- Tab through the main interactive path once with a keyboard.
- Check one normal state and one stressed state such as empty, error, loading, or success.
- Compare the PR screenshots against the checklist below instead of relying on memory.

## Screen Shells And Navigation

- [ ] The page has one clear screen title that matches the main task.
- [ ] Header, body, side panel, and footer regions are visually distinct enough to scan quickly.
- [ ] Repeated navigation does not overpower the primary task area.
- [ ] Sticky headers, floating bars, and side panels do not cover focused elements or critical messaging.
- [ ] Dense layouts still preserve a readable scan order from top-left to bottom-right.
- [ ] Keyboard focus moves through navigation and page content in a predictable order.
- [ ] Focus remains visible when drawers, sheets, and route transitions appear.
- [ ] Motion used in page transitions or sticky navigation does not distract from task completion.

Passing pattern: a dashboard has one page title, a clear primary content region, and sticky controls that never cover active fields.

Failing pattern: a floating header hides the focused field, or a drawer opens and focus jumps behind the active panel.

## Forms And Authentication Screens

- [ ] Every input, select, switch, checkbox, radio group, date picker, and textarea has a visible label.
- [ ] Required fields are identified consistently and do not rely on placeholder text alone.
- [ ] Labels remain visible while typing.
- [ ] Helper text appears next to the field it explains, not in a separate paragraph far away.
- [ ] Placeholder text is never the only place where critical instructions live.
- [ ] Validation messages say what went wrong and what to do next.
- [ ] Error copy appears near the affected field or form, not only in a toast.
- [ ] Success and destructive states are visually distinct and not color-only.
- [ ] The main submit path is reachable and understandable by keyboard users.
- [ ] Focus states stand out from hover and selected states on every field and button.
- [ ] Password, OTP, and email entry flows show clear state changes without excessive motion.

Passing pattern: a login screen shows visible labels, an inline error message, and a clear primary submit button with visible focus.

Failing pattern: an input depends on placeholder text for context, or an invalid state is shown only with a red border.

## Settings, Preferences, And Admin Panels

- [ ] Grouped controls use headings, cards, or separators that make the hierarchy obvious.
- [ ] Switches clearly describe what turns on or off and what changes immediately.
- [ ] Helper text for toggles, thresholds, and policy settings remains readable against the background.
- [ ] Tabbed settings views show both the active tab and the currently focused tab trigger clearly.
- [ ] Success, warning, and error feedback stays visible long enough to review.
- [ ] High-impact settings explain deadlines, irreversible outcomes, or retry steps in plain language.
- [ ] Save, cancel, and destructive actions are visually distinct from each other.
- [ ] Dense admin controls still provide touch-friendly hit areas for buttons, switches, and row actions.
- [ ] Auto-updating banners, counters, or status chips do not animate in ways that interrupt form entry.

Passing pattern: a settings screen groups platform, security, and notification controls into clear sections with readable helper text and durable save feedback.

Failing pattern: all controls appear in one undifferentiated block, or a success message disappears before a reviewer can read it.

## Data Views, Dashboards, And Reporting Screens

- [ ] KPI cards, charts, badges, and status rows remain readable against their backgrounds.
- [ ] Trend, warning, and success states are understandable without relying on color alone.
- [ ] Muted metadata such as date ranges, counts, and deadlines remains readable.
- [ ] Card actions, pagination, and row-level controls are discoverable by keyboard and touch, not just hover.
- [ ] Charts, placeholders, and loading states preserve layout so content does not jump when data appears.
- [ ] Focus order follows the visual order across cards, tabs, filters, and actions.
- [ ] Empty, loading, and no-results states guide the next action instead of leaving dead ends.
- [ ] Decorative count-up or chart animations support comprehension and have a reduced-motion fallback.

Passing pattern: a KPI grid uses text plus icon meaning, readable metadata, and stable loading placeholders that do not shift buttons.

Failing pattern: a chart uses color as the only meaning cue, or row actions appear only on hover with no visible keyboard path.

## Overlays, Popovers, Drawers, Modals, And Pickers

- [ ] The trigger, title, body, and primary action are all visible without accidental clipping.
- [ ] Focus stays inside the active overlay until it is dismissed.
- [ ] Opening an overlay moves focus to a logical starting point inside it.
- [ ] Closing an overlay returns focus to a sensible trigger or nearby control.
- [ ] Popovers, selects, date pickers, and menus do not render off-screen on desktop or mobile.
- [ ] Background content is visually de-emphasized but remains stable when the overlay closes.
- [ ] Focus states remain visible on icon-only controls and compact menu items.
- [ ] Motion used for opening and closing overlays does not block the user from acting quickly.

Passing pattern: a date picker opens aligned to its trigger, keeps focus within the popover, and closes back to the trigger without layout shift.

Failing pattern: a modal clips the primary action below the fold, or focus escapes into the page behind it.

## Lists, Tables, Filters, And Option Builders

- [ ] Filter controls have visible labels or nearby headings that explain what they change.
- [ ] Icon-only add, remove, copy, or clear actions have enough visible context to make the action obvious.
- [ ] Rows, cards, and option groups preserve readable spacing and touch-friendly targets.
- [ ] Repeated actions such as remove, reorder, and expand show visible focus and active states.
- [ ] Validation for dynamic rows explains which row failed and what to fix.
- [ ] Empty rows, loading rows, and no-results states still guide the next action.
- [ ] Animated insertion, removal, or reordering does not disrupt orientation or cause focus loss.

Passing pattern: a dynamic option builder labels the group, gives each row a predictable focus path, and keeps add/remove controls understandable.

Failing pattern: a trash icon appears with no visible context, or inserting a row causes focus to disappear.

## Cross-Screen Accessibility Checks

- [ ] Body text, labels, helper text, and badges remain readable in all supported themes.
- [ ] Disabled controls stay legible enough to explain what is unavailable.
- [ ] Click and tap targets are large enough for frequent actions, especially icon buttons and compact controls.
- [ ] Hover-only behavior is never required to discover a critical action.
- [ ] Reduced-motion behavior is defined for page transitions, counters, charts, decorative backgrounds, and overlays.

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

- Pass: visible labels for email and password, inline destructive alert for failed login, clear primary action, and a short keyboard path.
- Risk to watch: the alert is page-level only, so future field-specific validation should not be added without nearby messaging.

### `app/(dashboard)/settings`

- Pass: most inputs and switches have visible labels and helper text, sections are grouped with headings and separators, and the screen maps well to the settings/admin checklist.
- Risk to watch: success feedback auto-clears after 3 seconds, which is easy to miss for slower readers.
- Risk to watch: tabbed settings UIs need visible focus treatment and clear active-state contrast during review.

### `app/(dashboard)/events/new`

- Pass: main fields are labeled, preview helps confirm content before submit, and primary and secondary actions are separated.
- Risk to watch: icon-only add and remove buttons need strong visible focus and clear accessible intent in design review.
- Risk to watch: deadline picker, category select, and dynamic option rows should be checked against the overlay and option-builder sections for keyboard order and clipping.
