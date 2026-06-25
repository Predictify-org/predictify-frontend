# StreamPay Usability Testing — Design Review Checklist & Handoff Documentation

**Study:** StreamPay Core Flows Usability Test  
**Issue:** #70 FigJam: usability test script — 5 tasks for "create, pause, settle, and withdraw a stream"  
**Date:** April 2026  

---

## Design Review Checklist

### Pre-Review Preparation

**Reviewers Required:**
- [ ] At least one product stakeholder
- [ ] At least one engineering stakeholder
- [ ] UX/Design representative (if different from designer)

**Materials to Prepare:**
- [ ] FigJam file with task scripts and flows
- [ ] Figma prototypes (if applicable)
- [ ] This checklist
- [ ] Design review notes template
- [ ] StreamPay brand guidelines (for reference)

---

## Design Crit Questions

### Product & Strategy
- [ ] Do the tasks cover the complete stream lifecycle (connect → create → pause → settle → withdraw)?
- [ ] Are the task scenarios realistic for target users?
- [ ] Do the success criteria align with business goals?
- [ ] Is the scope appropriate for a 45-60 minute session?
- [ ] Are there any critical flows missing from this test?

### User Experience
- [ ] Are task instructions clear and unambiguous?
- [ ] Do think-aloud prompts encourage useful feedback?
- [ ] Is the cognitive load appropriate for each task?
- [ ] Are the tasks ordered logically (learning curve considered)?
- [ ] Will participants understand the domain (Stellar/blockchain) context?

### Technical Feasibility
- [ ] Can the test environment support all required flows?
- [ ] Are there any technical constraints that would affect testing?
- [ ] Do the tasks reflect actual implementation capabilities?
- [ ] Are error states covered in the test scenarios?
- [ ] Is the timing per task realistic given current performance?

### Accessibility & Inclusion
- [ ] Are accommodations documented for participants with disabilities?
- [ ] Can tasks be completed via keyboard only?
- [ ] Is the language inclusive for diverse technical backgrounds?
- [ ] Are materials available in accessible formats?
- [ ] Does the screener appropriately recruit users with accessibility needs?

### Content & Copy
- [ ] Is terminology consistent across all tasks?
- [ ] Are Stellar/blockchain terms explained or contextualized?
- [ ] Is the reading level appropriate for target audience?
- [ ] Are there any ambiguous phrases that could confuse participants?
- [ ] Is the tone appropriate for a fintech product?

---

## WCAG Self-Check Results

### Contrast & Visibility
- [ ] All text meets 4.5:1 contrast ratio (normal text)
- [ ] All text meets 3:1 contrast ratio (large text 18pt+)
- [ ] Focus indicators are highly visible
- [ ] Color is not used as the only means of conveying information
- [ ] Text can be resized to 200% without horizontal scrolling

**Gaps Documented:**
- [ ] List any contrast issues found
- [ ] List any focus visibility issues
- [ ] Rationale for any gaps deferred to Phase 2

### Keyboard Navigation
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order follows logical reading order
- [ ] No keyboard traps identified
- [ ] Skip links provided for long content
- [ ] Keyboard shortcuts documented

**Gaps Documented:**
- [ ] List any keyboard navigation issues
- [ ] Rationale for any gaps deferred to Phase 2

### Screen Reader Compatibility
- [ ] All images have alt text or are decorative
- [ ] Form fields have associated labels
- [ ] Interactive elements have accessible names
- [ ] State changes are announced (e.g., "stream paused")
- [ ] Error messages are associated with form fields

**Gaps Documented:**
- [ ] List any screen reader issues
- [ ] Rationale for any gaps deferred to Phase 2

---

## Figma Documentation Requirements

### Screen States to Document

**For Each Flow (Connect, Create, Pause, Settle, Withdraw):**
- [ ] Empty state (no data, no wallet connected)
- [ ] Loading state (processing transaction)
- [ ] Success state (operation completed)
- [ ] Error state (transaction failed, validation error)
- [ ] In-progress state (stream active, partially settled)

**Stream Lifecycle States:**
- [ ] Draft (stream created but not started)
- [ ] Active (streaming payments)
- [ ] Paused (temporarily stopped)
- [ ] Settled/Ended (permanently closed)

### Component Specifications

**Required for Each Component:**
- [ ] Component name
- [ ] Dimensions and spacing
- [ ] Typography (font, size, weight, line height)
- [ ] Colors (hex codes for all states)
- [ ] Border radius and shadows
- [ ] Iconography (source, size, usage)
- [ ] Interactive states (default, hover, active, focus, disabled)
- [ ] Behavior (animations, transitions)

### Redlines

**Provide Redlines For:**
- [ ] Connect wallet modal/dialog
- [ ] Create stream form
- [ ] Stream list/card view
- [ ] Stream detail view
- [ ] Pause/settle confirmation dialogs
- [ ] Withdraw flow
- [ ] Error states
- [ ] Success/confirmation states

---

## Export Assets List

### Named Export Assets

**Icons:**
- [ ] Wallet connect icon
- [ ] Stream icon
- [ ] Pause icon
- [ ] Play/resume icon
- [ ] Settle/end icon
- [ ] Withdraw icon
- [ ] Success checkmark
- [ ] Error/warning icons
- [ ] Navigation icons

**Illustrations:**
- [ ] Empty state illustration (no streams)
- [ ] Empty state illustration (no wallet connected)
- [ ] Success illustration (stream created)
- [ ] Onboarding illustrations (if applicable)

**Component Assets:**
- [ ] Buttons (primary, secondary, tertiary)
- [ ] Input fields (default, error, focus)
- [ ] Cards/stream items
- [ ] Status badges (active, paused, settled)
- [ ] Modal backgrounds
- [ ] Toast notifications

### Asset Specifications
- [ ] Format: SVG (preferred), PNG (fallback)
- [ ] Sizes: 1x, 2x, 3x for raster assets
- [ ] Color variants: light theme, dark theme
- [ ] Naming convention: `component-state-size.format`

---

## Handoff Documentation

### Design System References

**Link to:**
- [ ] StreamPay design system (if exists)
- [ ] Component library (Figma components)
- [ ] Brand guidelines (colors, typography, logo)
- [ ] Icon set
- [ ] Illustration style guide

### Implementation Notes

**Technical Considerations:**
- [ ] Stellar wallet integration requirements
- [ ] Transaction timing expectations
- [ ] Error handling requirements
- [ ] Loading state duration guidelines
- [ ] Real-time updates (stream balance changes)

**Content Requirements:**
- [ ] Copy for all UI elements
- [ ] Error message copy
- [ ] Success message copy
- [ ] Help text and tooltips
- [ ] Legal disclaimers (if any)

### Developer Handoff

**Provide:**
- [ ] Figma link with developer mode enabled
- [ ] Prototype links for each flow
- [ ] CSS variables for design tokens
- [ ] Animation specifications (timing, easing)
- [ ] Responsive breakpoints
- [ ] Component usage guidelines

---

## Design Review Session Notes

**Date:** [Fill in after review]  
**Attendees:** [List names and roles]  
**Duration:** [Time]

### Feedback Summary

**Product Feedback:**
- [ ] 
- [ ] 

**Engineering Feedback:**
- [ ] 
- [ ] 

**UX/Design Feedback:**
- [ ] 
- [ ] 

### Action Items

| Priority | Item | Owner | Due Date |
|----------|------|-------|----------|
| High | | | |
| Medium | | | |
| Low | | | |

### Decisions Made

- [ ] 
- [ ] 

### Open Questions

- [ ] 
- [ ] 

---

## Phase 2 Gaps (Documented with Rationale)

### Identified Gaps

1. **Gap:** [Description]
   - **Rationale:** Why deferred to Phase 2
   - **Impact:** User impact if not addressed
   - **Priority:** High/Medium/Low

2. **Gap:** [Description]
   - **Rationale:** Why deferred to Phase 2
   - **Impact:** User impact if not addressed
   - **Priority:** High/Medium/Low

### Dependencies

**Brand/Legal Dependencies:**
- [ ] Legal review of disclaimers
- [ ] Brand approval of illustrations
- [ ] Compliance review for financial terminology

**Technical Dependencies:**
- [ ] Stellar SDK finalization
- [ ] Soroban smart contract integration (TBD)
- [ ] Wallet provider integration

---

## Final Sign-Off

**Design Review Complete:**
- [ ] Product stakeholder sign-off
- [ ] Engineering stakeholder sign-off
- [ ] UX/Design sign-off

**Ready for:**
- [ ] Usability testing sessions
- [ ] Implementation (if approved)
- [ ] Stakeholder presentation

---

## Appendix: FigJam File Structure

**Suggested FigJam Board Organization:**

1. **Section 1: Overview & Context**
   - Study objectives
   - Target users
   - Stream lifecycle diagram

2. **Section 2: Task Scripts**
   - Task 1: Connect Wallet
   - Task 2: Create Stream
   - Task 3: Pause Stream
   - Task 4: Settle Stream
   - Task 5: Withdraw

3. **Section 3: Flows & Wireframes**
   - Connect wallet flow
   - Create stream flow
   - Pause/settle flow
   - Withdraw flow

4. **Section 4: Recruitment & Consent**
   - Screener questions
   - Consent form

5. **Section 5: Accessibility**
   - A11y accommodations
   - WCAG checklist

6. **Section 6: Review Notes**
   - Design crit feedback
   - Action items
   - Decisions

---

## Contact

**Design Lead:** [Name]  
**Email:** [design@streampay.org](mailto:design@streampay.org)  
**Figma File:** [Link to be added after review]
