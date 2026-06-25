# StreamPay Usability Testing — Accessibility Notes

**Study:** StreamPay Core Flows Usability Test  
**Issue:** #70 FigJam: usability test script — 5 tasks for "create, pause, settle, and withdraw a stream"  
**Date:** April 2026  

---

## Overview

This document provides accessibility accommodations and considerations for usability testing sessions. StreamPay is committed to inclusive design, and testing with participants who have accessibility needs helps ensure the product is usable by everyone.

---

## Pre-Session Accessibility Checklist

### Recruitment Phase

- [ ] Screener includes accessibility needs questions
- [ ] Recruitment materials available in multiple formats (text, large print)
- [ ] Screening questions use inclusive language for technical experience
- [ ] No assumptions made about participant abilities

### Scheduling

- [ ] Ask about accommodation needs during scheduling
- [ ] Offer flexible timing for participants who may need breaks
- [ ] Confirm accessibility tools participant uses (screen reader, magnification, etc.)
- [ ] Test environment compatibility with participant's tools

---

## Session Accommodations

### Screen Reader Users

**Preparation:**
- Ensure test environment is screen reader compatible
- Test with common screen readers (NVDA, JAWS, VoiceOver, TalkBack)
- Provide keyboard-only navigation paths for all tasks
- Verify all interactive elements have proper ARIA labels

**During Session:**
- Allow extra time for navigation (typically 2-3x longer)
- Don't interrupt screen reader announcements
- Ask participant to describe what they're hearing
- Note where screen reader announces unclear information

**Materials:**
- Provide task instructions in plain text format
- Avoid relying on visual cues in instructions (e.g., "click the blue button")
- Use descriptive language: "activate the Connect Wallet button"

### Low Vision Users

**Preparation:**
- Ensure high contrast mode is available
- Test with magnification tools (ZoomText, built-in OS magnification)
- Verify text can be resized up to 200% without breaking layout
- Ensure focus indicators are highly visible

**During Session:**
- Allow participant to use their preferred magnification settings
- Be patient with navigation speed
- Ask about visibility of key elements
- Note any elements that are difficult to see or distinguish

**Materials:**
- Provide large-print version of task script (18pt+)
- Use high-contrast colors in any visual materials
- Avoid red/green color coding alone (use icons + text)

### Keyboard-Only Users

**Preparation:**
- Verify all functionality is accessible via keyboard
- Test tab order follows logical reading order
- Ensure focus indicators are always visible
- Verify keyboard shortcuts are documented

**During Session:**
- Observe tab order and focus management
- Note where keyboard navigation is inefficient
- Ask about any keyboard traps or navigation issues

**Materials:**
- Document keyboard shortcuts in task instructions
- Provide alternative methods for any mouse-dependent actions

### Cognitive Accessibility

**Preparation:**
- Simplify task instructions where possible
- Avoid jargon or technical terms when not necessary
- Use consistent terminology throughout
- Provide clear error messages and recovery paths

**During Session:**
- Allow extra processing time
- Repeat instructions if requested
- Break complex tasks into smaller steps if needed
- Note areas where cognitive load is high

**Materials:**
- Use plain language in all instructions
- Provide examples for abstract concepts
- Allow for breaks between tasks

---

## Accessible Task Script Modifications

### Original vs. Accessible Wording

**Original:** "Click the blue 'Connect Wallet' button in the top right corner"

**Accessible:** "Activate the 'Connect Wallet' button located in the header"

**Original:** "Look for the stream with the highest balance"

**Accessible:** "Find the stream that shows 100 XLM as the remaining balance"

**Original:** "Drag the slider to adjust the amount"

**Accessible:** "Use the slider or input field to set the amount to 100 XLM"

---

## Testing Environment Accessibility

### WCAG 2.1 Level AA Compliance Checklist

**Perceivable:**
- [ ] Text alternatives for non-text content (alt text, ARIA labels)
- [ ] Captions for audio content (if applicable)
- [ ] Content can be presented in different ways without losing information
- [ ] Foreground and background colors have sufficient contrast (4.5:1 for text)
- [ ] Text can be resized up to 200% without assistive technology

**Operable:**
- [ ] All functionality available via keyboard
- [ ] No keyboard traps
- [ ] Sufficient time to read and use content (no timeouts)
- [ ] No content that flashes more than 3 times per second
- [ ] Navigation mechanisms help users find content

**Understandable:**
- [ ] Text is readable and understandable
- [ ] Content appears and operates in predictable ways
- [ ] Input assistance helps users avoid and correct mistakes

**Robust:**
- [ ] Compatible with current and future assistive technologies
- [ ] Proper HTML semantics
- [ ] ARIA attributes used correctly

---

## Session Logistics for Accessibility

### Remote Testing Considerations

- [ ] Test video conferencing platform accessibility
- [ ] Ensure screen sharing works with assistive technologies
- [ ] Provide alternative to screen sharing if needed (e.g., remote control)
- [ ] Verify audio quality for screen reader users

### In-Person Testing Considerations

- [ ] Accessible meeting location (ramps, elevators, accessible restrooms)
- [ ] Quiet environment to reduce audio interference
- [ ] Adjustable lighting for low-vision participants
- [ ] Comfortable seating with space for assistive devices

---

## Data Collection Adjustments

### For Screen Reader Users
- Note screen reader announcements (what's said, what's missing)
- Record navigation paths taken
- Document any workarounds participant uses

### For Low Vision Users
- Note visibility issues (contrast, size, clutter)
- Document magnification level used
- Record any elements that couldn't be located

### For Keyboard-Only Users
- Document tab order issues
- Note any keyboard traps
- Record inefficient navigation paths

---

## Phase 2 Accessibility Gaps (Documented for Future)

The following accessibility features are noted for Phase 2 implementation:

1. **Customizable color themes** - Currently not in scope; users must rely on OS-level high contrast
2. **Voice control support** - Not tested in this study; future consideration
3. **Reduced motion mode** - Not implemented; may be needed for vestibular disorders
4. **Customizable font sizes** - Currently limited to OS browser zoom
5. **Audio cues for actions** - Not implemented; could help screen reader users

**Rationale:** These features are important but beyond the scope of the initial usability test. They should be prioritized based on user feedback from this study.

---

## Accessibility Testing Goals

**Primary Goals:**
- Validate core flows are usable with assistive technologies
- Identify critical accessibility barriers
- Gather feedback from users with diverse needs

**Secondary Goals:**
- Inform accessibility roadmap
- Establish baseline for future accessibility audits
- Build inclusive design culture

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Accessibility Checklist](https://webaim.org/standards/wcag/checklist)
- [A11Y Project Checklist](https://www.a11yproject.com/checklist/)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [WAVE Browser Extension](https://wave.webaim.org/)

---

## Contact

For accessibility questions or accommodations, contact:  
**Accessibility Lead:** [Name]  
**Email:** [a11y@streampay.org](mailto:a11y@streampay.org)
