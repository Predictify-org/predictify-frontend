/**
 * MODIFIED: Replaced the previous inline events page implementation with the
 * EventsSection component system. This page now delegates to the composable
 * EventsSection which includes:
 * - Page title with "Create Event" primary button
 * - Status tabs (Ongoing, Upcoming, Past) with event counts
 * - Search input, category filters, date range picker, and sort controls
 * - Data table with columns: Title, Category, Odds, End Date, Time Remaining, Participants, Actions
 * - Row actions dropdown (Edit, Delete with confirmation dialog)
 * - Loading skeleton state
 * - Empty state with contextual messaging
 * - Pagination controls
 */
import { EventsSection } from "@/components/events/events-section"

export default function EventsPage() {
  return <EventsSection />
}
