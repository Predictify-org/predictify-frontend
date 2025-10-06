// Event data types and interfaces
export interface Event {
  id: string
  title: string
  txHash: string
  category: "Football" | "Politics" | "Crypto" | "Stocks"
  odds: number
  startDate: string
  endDate: string
  status: "ongoing" | "upcoming" | "past"
  timeRemaining?: string
  timeRemainingMs?: number
}

export interface EventFilters {
  search: string
  category: string[]
  oddsRange: [number, number]
  dateRange: {
    from: Date | null
    to: Date | null
  }
  status: "ongoing" | "upcoming" | "past"
}

export interface EventSort {
  field: "title" | "category" | "odds" | "endDate" | "timeRemaining"
  direction: "asc" | "desc"
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}
