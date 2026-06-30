# StreamPay Usability Testing — Design Deliverables

**Issue:** [#70 FigJam: usability test script — 5 tasks for "create, pause, settle, and withdraw a stream"](https://github.com/Streampay-Org/StreamPay-Frontend/issues/70)  
**Date:** April 2026  
**Status:** Design Review Ready  

---

## Overview

This package contains the complete design deliverables for usability testing StreamPay's core flows. The deliverables include a 5-task usability test script, recruitment screener, consent template, accessibility notes, and design review documentation.

**Scope:** UI/UX and product design (Figma, interaction, content). This is not a request to implement UI in the Next.js StreamPay-Frontend codebase; these are design artifacts and handoff materials only.

---

## Deliverables

### 1. Task Script (`task-script.md`)
Complete 5-task usability test script covering the StreamPay stream lifecycle:
- **Task 1:** Connect Stellar Wallet
- **Task 2:** Create a Payment Stream
- **Task 3:** Pause an Active Stream
- **Task 4:** Settle (End) a Stream Early
- **Task 5:** Withdraw Funds from Settled Stream

Each task includes:
- Context and scenario
- Success criteria
- Think-aloud prompts
- Observer notes checklist

### 2. Recruitment Screener (`recruitment-screener.md`)
Inclusive screening questionnaire for recruiting participants:
- Basic information and demographics
- Technical experience (blockchain optional)
- Stellar familiarity (inclusive wording)
- Payment habits
- Availability and accessibility needs
- Recording consent

### 3. Consent Template (`consent-template.md`)
One-page informed consent form covering:
- Study purpose and procedures
- Voluntary participation
- Confidentiality and data handling
- Recording preferences
- Risks and benefits
- Contact information

### 4. Accessibility Notes (`accessibility-notes.md`)
Comprehensive accessibility accommodations and considerations:
- Pre-session accessibility checklist
- Session accommodations (screen reader, low vision, keyboard-only, cognitive)
- WCAG 2.1 Level AA compliance checklist
- Accessible task script modifications
- Testing environment accessibility
- Phase 2 accessibility gaps documentation

### 5. Design Review Checklist (`design-review-checklist.md`)
Complete design review and handoff documentation:
- Pre-review preparation
- Design crit questions (product, UX, technical, accessibility, content)
- WCAG self-check results
- Figma documentation requirements
- Export assets list
- Handoff documentation
- Design review session notes template

---

## FigJam Setup Instructions

### Creating the FigJam Board

1. **Create New FigJam File**
   - Go to [figma.com](https://figma.com)
   - Create new FigJam file
   - Name: `StreamPay Usability Testing — 5-Task Script`

2. **Organize Sections**
   Create 6 main sections using FigJam sections:
   - Section 1: Overview & Context
   - Section 2: Task Scripts
   - Section 3: Flows & Wireframes
   - Section 4: Recruitment & Consent
   - Section 5: Accessibility
   - Section 6: Review Notes

3. **Add Content to Each Section**

   **Section 1: Overview & Context**
   - Add sticky note with study objectives
   - Add sticky note with target users
   - Create flow diagram: Draft → Active → Paused → Settled/Ended
   - Add timeline: 45-60 minutes per session

   **Section 2: Task Scripts**
   - For each task (1-5), create a sticky note or card with:
     - Task title
     - Context
     - Instructions
     - Success criteria (checkbox list)
     - Think-aloud prompts
     - Observer notes (checkbox list)
   - Use different colors for each task for visual distinction

   **Section 3: Flows & Wireframes**
   - Create flow diagrams for each core flow:
     - Connect wallet flow
     - Create stream flow
     - Pause/settle flow
     - Withdraw flow
   - Add wireframes or link to Figma prototypes
   - Annotate key decision points

   **Section 4: Recruitment & Consent**
   - Add screener questions as a checklist
   - Add consent form as a text block
   - Include recording preference checkboxes

   **Section 5: Accessibility**
   - Add WCAG checklist as a checklist
   - Document accommodations needed
   - List Phase 2 accessibility gaps

   **Section 6: Review Notes**
   - Add design crit feedback area
   - Create action items table
   - Add decisions made section
   - Leave space for open questions

4. **Add Collaborative Elements**
   - Add voting widgets for task priority
   - Add timer widget for session timing reference
   - Add emoji reactions for quick feedback
   - Use comments for reviewer feedback

### Linking to Figma

1. **Create Figma File for UI Flows**
   - Create separate Figma design file
   - Build wireframes/prototypes for each flow
   - Document components and states

2. **Link FigJam to Figma**
   - In FigJam, use "Embed" to link Figma frames
   - Or add Figma file links as hyperlinks
   - Ensure links are accessible and descriptive

### Sharing the FigJam

1. **Set Sharing Permissions**
   - Click "Share" in FigJam
   - Set to "Anyone with the link can view"
   - Or invite specific stakeholders via email

2. **Add to Issue**
   - Copy FigJam share URL
   - Add URL as comment in issue #70
   - Include brief description of what's included

---

## Using This Package

### For Researchers

1. **Review the task script** to understand the test flow
2. **Customize the screener** for your specific recruitment needs
3. **Adapt the consent template** to your organization's requirements
4. **Review accessibility notes** to ensure inclusive testing
5. **Set up FigJam board** using the instructions above
6. **Conduct pilot test** with internal participant (5-min cognitive walkthrough)
7. **Refine wording** based on pilot feedback
8. **Schedule and conduct sessions**

### For Designers

1. **Use design review checklist** to prepare for design crit
2. **Complete WCAG self-check** before review
3. **Document all screen states** in Figma (empty, loading, error, success)
4. **Create export assets** according to the asset list
5. **Conduct design review** with product and engineering stakeholders
6. **Document feedback** in the review notes section
7. **Update FigJam** with review decisions and action items

### For Product Managers

1. **Review task scenarios** for alignment with business goals
2. **Participate in design review** to validate flows
3. **Prioritize action items** from design review
4. **Plan follow-up activities** (journey mapping, additional workshops)

### For Engineers

1. **Review technical feasibility** during design review
2. **Identify implementation dependencies**
3. **Review component specifications** in Figma
4. **Provide feedback on error states and edge cases**
5. **Plan implementation** based on handoff documentation

---

## Timeline

- **Week 1:** Design deliverables creation (this package)
- **Week 1:** Design review with stakeholders
- **Week 2:** FigJam board setup and refinement
- **Week 2:** Internal pilot test (5-min cognitive walkthrough)
- **Week 3-4:** Usability testing sessions (separate program)
- **Week 5:** Analysis and findings (separate program)

**Total for this issue:** 96 hours to review-ready FigJam v1

---

## Dependencies

**Brand/Legal:**
- Legal review of consent form
- Brand approval of illustrations (if added to FigJam)
- Compliance review for financial terminology

**Technical:**
- Stellar SDK finalization
- Soroban smart contract integration (TBD - noted in script)
- Test environment availability

**Stakeholders:**
- Product manager availability for design review
- Engineering availability for feasibility review
- Accessibility expert (if available) for a11y review

---

## Next Steps After This Issue

1. **Set up FigJam board** using these deliverables as content
2. **Conduct design review** with at least one product and one engineering stakeholder
3. **Run internal pilot** (5-min cognitive walkthrough with 1 internal person)
4. **Refine task wording** based on pilot feedback
5. **Link FigJam URL** in issue #70 closeout comment
6. **Plan usability testing sessions** (separate issue/program)
7. **Hand off to journey mapping** and Figma flows (optional workshop)

---

## FigJam URL

**FigJam Board:** [To be added after setup]  
**Figma Design File:** [To be added after design review]

---

## Contributing

This is a design deliverable package. For contributions:
- Update task scripts based on research findings
- Add accessibility improvements as they're identified
- Expand documentation as flows evolve
- Update FigJam board with review feedback

---

## License

MIT - Same as StreamPay-Frontend repository

---

## Contact

**Design Lead:** [Name]  
**Email:** [design@streampay.org](mailto:design@streampay.org)  
**GitHub Issue:** [#70](https://github.com/Streampay-Org/StreamPay-Frontend/issues/70)

---

## Appendix: File Structure

```
design/usability-testing/
├── README.md                           # This file
├── task-script.md                     # 5-task usability test script
├── recruitment-screener.md            # Participant screening questionnaire
├── consent-template.md                # One-page informed consent form
├── accessibility-notes.md             # A11y accommodations and WCAG checklist
└── design-review-checklist.md         # Design review and handoff documentation
```
