import { mockPredictionHistoryByAddress } from "@/lib/mock-data"
import type { PredictionRecord } from "@/lib/track-record"

export interface PredictionHistoryProvider {
  getPredictionHistory(
    addr: string,
    signal: AbortSignal,
  ): Promise<PredictionRecord[]>
}

export const getPredictionHistory: PredictionHistoryProvider["getPredictionHistory"] =
  async (addr, signal) => {
    if (signal.aborted) {
      throw new DOMException("The request was aborted.", "AbortError")
    }

    const address = addr.trim().toUpperCase()
    return mockPredictionHistoryByAddress[address] ?? []
  }
