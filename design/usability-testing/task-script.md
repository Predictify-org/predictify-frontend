# StreamPay Usability Testing — 5-Task Script

**Study:** StreamPay Core Flows Usability Test  
**Issue:** #70 FigJam: usability test script — 5 tasks for "create, pause, settle, and withdraw a stream"  
**Date:** April 2026  
**Duration:** 45-60 minutes  

---

## Session Overview

This usability test evaluates the core StreamPay flows for managing Stellar-based payment streams. Participants will complete 5 tasks that cover the complete stream lifecycle: connecting a wallet, creating a stream, pausing, settling, and withdrawing.

**Target timing per task:**
- Task 1 (Connect Wallet): 5-7 minutes
- Task 2 (Create Stream): 10-12 minutes
- Task 3 (Pause Stream): 5-7 minutes
- Task 4 (Settle Stream): 8-10 minutes
- Task 5 (Withdraw): 8-10 minutes

**Total session time:** 45-60 minutes (including introduction and debrief)

---

## Pre-Task Instructions

**Before each task, read aloud:**

> "For this task, I'd like you to think aloud as you work through it. Please tell me what you're looking at, what you're thinking, and what you're trying to do. There are no wrong answers—we're interested in your thought process, not whether you complete the task perfectly."

---

## Task 1: Connect Stellar Wallet

### Context
You are a new user who wants to use StreamPay to manage payment streams. Before you can create or manage any streams, you need to connect your Stellar wallet to the application.

### Task Instructions
"Please connect your Stellar wallet to StreamPay. You may use any wallet you're comfortable with, or use the provided test wallet if you don't have one."

### Success Criteria
- Participant successfully initiates wallet connection
- Participant understands which wallet options are available
- Participant can complete the connection flow (or reaches the appropriate error state if they lack a wallet)
- Participant can see their connected wallet address/balance after connection

### Think-Aloud Prompts
- "What do you expect to see when you click 'Connect Wallet'?"
- "What information are you looking for to confirm your wallet is connected?"
- "Is there anything confusing about the wallet connection process?"

### Observer Notes
- [ ] Wallet connection button easily discoverable
- [ ] Wallet options clearly presented
- [ ] Connection feedback clear (success/error states)
- [ ] User understands what "connecting wallet" means
- [ ] Any confusion about wallet selection

---

## Task 2: Create a Payment Stream

### Context
You want to set up a recurring payment stream to send 100 XLM per month to a recipient named "Alex" for the next 6 months. The stream should start immediately.

### Task Instructions
"Create a new payment stream with the following details:
- Recipient: Alex (stellar address: GABC...XYZ)
- Amount: 100 XLM per month
- Duration: 6 months
- Start date: Immediately"

### Success Criteria
- Participant can locate the "Create Stream" feature
- Participant can input all required fields (recipient, amount, duration, start date)
- Participant understands the stream terms (total amount, flow rate, end date)
- Participant successfully submits the stream creation
- Participant sees confirmation of stream creation with key details

### Think-Aloud Prompts
- "Where would you look to create a new stream?"
- "What information do you need to provide to create this stream?"
- "Do you understand what will happen with this stream over the 6 months?"
- "Is there anything about the stream terms that's unclear?"

### Observer Notes
- [ ] "Create Stream" action discoverable
- [ ] Form fields clear and well-labeled
- [ ] Stream terms (total, rate, dates) understandable
- [ ] Validation messages helpful
- [ ] Confirmation provides clear next steps
- [ ] User understands stream lifecycle (draft → active)

---

## Task 3: Pause an Active Stream

### Context
You have an active payment stream to Alex, but you need to temporarily pause it because of a cash flow issue. You want to pause it now and resume it later.

### Task Instructions
"Pause the active stream to Alex. After pausing, verify that the stream is indeed paused and understand how to resume it."

### Success Criteria
- Participant can locate the active stream
- Participant can find the "Pause" option
- Participant understands what pausing means (payments stop, stream remains)
- Participant successfully pauses the stream
- Participant can see the paused state and understand how to resume

### Think-Aloud Prompts
- "How would you find the stream you want to pause?"
- "What do you expect to happen when you pause a stream?"
- "Can you tell the stream is paused? What indicates this?"
- "How would you resume this stream if needed?"

### Observer Notes
- [ ] Stream list/filtering helps find specific stream
- [ ] "Pause" action clearly available
- [ ] Pause vs. cancel distinction understood
- [ ] Paused state visually distinct
- [ ] Resume action discoverable
- [ ] User understands paused vs. ended states

---

## Task 4: Settle (End) a Stream Early

### Context
You've decided to end your payment stream to Alex early, after 3 months instead of the full 6 months. You want to settle the stream and close it out completely.

### Task Instructions
"Settle (end) the stream to Alex early. Verify that the stream is closed and understand what happens to any remaining funds."

### Success Criteria
- Participant can locate the "Settle" or "End" option
- Participant understands the difference between pause and settle
- Participant successfully settles the stream
- Participant sees confirmation of settlement
- Participant understands the final state (stream ended, no further payments)

### Think-Aloud Prompts
- "What's the difference between pausing and settling a stream?"
- "What do you expect to happen when you settle this stream?"
- "Can you tell the stream has been settled? What indicates this?"
- "Is there anything about the settlement process that concerns you?"

### Observer Notes
- [ ] "Settle" vs "Pause" distinction clear
- [ ] Settlement consequences explained
- [ ] Confirmation before settlement (prevent accidental closes)
- [ ] Settled state visually distinct from paused
- [ ] User understands stream lifecycle (active → settled/ended)

---

## Task 5: Withdraw Funds from Settled Stream

### Context
Your stream to Alex has been settled, and there are remaining funds in the stream that you want to withdraw back to your wallet.

### Task Instructions
"Withdraw any remaining funds from the settled stream to Alex back to your connected wallet."

### Success Criteria
- Participant can locate the withdrawal option
- Participant can see the available balance to withdraw
- Participant successfully initiates withdrawal
- Participant understands the withdrawal process and timing
- Participant sees confirmation of withdrawal request

### Think-Aloud Prompts
- "Where would you look to withdraw funds from this stream?"
- "How much can you withdraw? Is this clear?"
- "What do you expect to happen after you request a withdrawal?"
- "Is there anything about the withdrawal process that's unclear?"

### Observer Notes
- [ ] Withdrawal action discoverable
- [ ] Available balance clearly displayed
- [ ] Withdrawal process/timing explained
- [ ] Confirmation provides transaction details
- [ ] User understands finality of withdrawal

---

## Post-Task Debrief Questions

After completing all tasks, ask:

1. **Overall Experience:**
   - "How was your overall experience using StreamPay?"
   - "What was the most confusing part of the process?"
   - "What was the easiest part?"

2. **Trust and Confidence:**
   - "How confident do you feel about managing real money with this interface?"
   - "Is there anything that would make you feel more secure?"

3. **Feature Feedback:**
   - "Which feature (connect, create, pause, settle, withdraw) felt most intuitive?"
   - "Which feature needs the most improvement?"

4. **Suggestions:**
   - "If you could change one thing about StreamPay, what would it be?"
   - "Is there anything you expected to see but didn't?"

---

## Cognitive Walkthrough Notes (Optional Internal Pilot)

**Date:** [Fill in after pilot]  
**Internal Pilot Participant:** [Name]  
**Duration per task:**
- Task 1: ___ minutes
- Task 2: ___ minutes
- Task 3: ___ minutes
- Task 4: ___ minutes
- Task 5: ___ minutes

**Findings to address:**
- [ ] Wording clarifications needed
- [ ] Task instructions ambiguous
- [ ] Success criteria too strict/lenient
- [ ] Think-aloud prompts effective?
- [ ] Timing adjustments needed

---

## StreamPay Lifecycle Reference

For researchers and designers, reference the StreamPay stream states:

```
Draft → Active → Paused → Settled/Ended
  ↑        ↑         ↑          ↑
Create   Start    Pause     Close/Settle
```

**Key distinctions:**
- **Draft:** Stream created but not yet started
- **Active:** Stream is actively streaming payments
- **Paused:** Stream temporarily stopped, can be resumed
- **Settled/Ended:** Stream permanently closed, no further payments possible

---

## Soroban/Stellar Context (TBD)

**Note:** Soroban smart contract integration is TBD for future phases. Current script focuses on core streaming functionality without smart contract specifics. If Soroban is added to the product, update tasks to include:
- Smart contract deployment/interaction
- Vesting schedule configuration
- Escrow conditions
- Additional security confirmations

---

## Session Logistics

**Environment:**
- Test environment URL: [To be provided]
- Test wallet credentials: [To be provided if using shared test wallet]
- Figma prototype URL: [To be provided if testing prototype instead of live app]

**Materials:**
- This task script
- Consent form (signed)
- Screener responses
- Recording equipment (if consented)

**Data Collection:**
- Screen recording
- Audio recording
- Observer notes
- Task completion times
- Success/failure per task
- Participant quotes (key insights)
