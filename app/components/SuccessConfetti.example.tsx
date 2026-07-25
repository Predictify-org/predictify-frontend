/**
 * SuccessConfetti Integration Example
 * 
 * This file demonstrates how to integrate the SuccessConfetti component
 * into the prediction success flow.
 * 
 * INTEGRATION PATTERN:
 * 
 * 1. Add state to track when confetti should show:
 *    const [showConfetti, setShowConfetti] = useState(false)
 * 
 * 2. Render the SuccessConfetti component at the page/layout level:
 *    <SuccessConfetti isVisible={showConfetti} />
 * 
 * 3. Trigger confetti when prediction succeeds:
 *    - After successful API call
 *    - After notifyBetPlaced() is called
 *    - Set showConfetti to true
 * 
 * 4. Reset confetti state after a delay:
 *    setTimeout(() => setShowConfetti(false), 5000)
 * 
 * EXAMPLE INTEGRATION LOCATIONS:
 * 
 * Option A: In the dashboard layout (app/(dashboard)/layout.tsx)
 * - Add confetti state at layout level
 * - Pass down trigger function via context or callback
 * - Confetti will appear on prediction success from any page
 * 
 * Option B: In specific prediction pages
 * - app/(dashboard)/events/event-page/EventDetailsClient.tsx
 * - app/components/BetForm.tsx
 * - Add confetti directly where predictions happen
 * 
 * RECOMMENDED: Option A (Layout Level)
 * Benefits:
 * - Centralized confetti logic
 * - Works across all prediction flows
 * - Single source of truth
 */

"use client"

import { useState } from "react"
import { SuccessConfetti } from "./SuccessConfetti"
import { notifyBetPlaced } from "@/lib/audio/notify-success"

/**
 * Example: Dashboard Layout with Confetti Support
 * 
 * This example shows how to add confetti to the dashboard layout.
 * The confetti will trigger on any successful prediction across the app.
 */
export function DashboardWithConfettiExample({ children }: { children: React.ReactNode }) {
  const [showConfetti, setShowConfetti] = useState(false)

  const handlePredictionSuccess = () => {
    // Show confetti
    setShowConfetti(true)

    // Hide confetti after 5 seconds (matches toast duration)
    setTimeout(() => {
      setShowConfetti(false)
    }, 5000)
  }

  return (
    <>
      {/* Confetti overlay - renders on top of everything */}
      <SuccessConfetti isVisible={showConfetti} />

      {/* Your dashboard content */}
      {children}
    </>
  )
}

/**
 * Example: Prediction Form with Confetti
 * 
 * This example shows how to trigger confetti from a bet form component.
 */
export function BetFormWithConfettiExample() {
  const [showConfetti, setShowConfetti] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitBet = async (amount: number) => {
    setIsSubmitting(true)

    try {
      // 1. Submit bet to API
      await submitBetToAPI({ amount })

      // 2. Show success notification
      notifyBetPlaced({
        title: "Prediction placed",
        description: `Your ${amount} XLM prediction has been confirmed.`,
        onSuccess: () => {
          // 3. Trigger confetti on success
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 5000)
        },
      })
    } catch (error) {
      console.error("Bet submission failed:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <SuccessConfetti isVisible={showConfetti} />
      
      <form onSubmit={(e) => {
        e.preventDefault()
        handleSubmitBet(100) // Example: 100 XLM
      }}>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Placing bet..." : "Place Bet"}
        </button>
      </form>
    </>
  )
}

/**
 * Example: Using with Context (Advanced)
 * 
 * For complex apps, use React Context to provide confetti trigger
 * function throughout the component tree.
 */
import { createContext, useContext } from "react"

interface ConfettiContextValue {
  triggerConfetti: () => void
}

const ConfettiContext = createContext<ConfettiContextValue | null>(null)

export function ConfettiProvider({ children }: { children: React.ReactNode }) {
  const [showConfetti, setShowConfetti] = useState(false)

  const triggerConfetti = () => {
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 5000)
  }

  return (
    <ConfettiContext.Provider value={{ triggerConfetti }}>
      <SuccessConfetti isVisible={showConfetti} />
      {children}
    </ConfettiContext.Provider>
  )
}

export function useConfetti() {
  const context = useContext(ConfettiContext)
  if (!context) {
    throw new Error("useConfetti must be used within ConfettiProvider")
  }
  return context
}

// Usage in any component:
// const { triggerConfetti } = useConfetti()
// triggerConfetti() // Trigger confetti from anywhere

// Dummy API function for example
async function submitBetToAPI({ amount }: { amount: number }) {
  return new Promise((resolve) => setTimeout(resolve, 1000))
}
