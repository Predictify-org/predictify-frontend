# CopyAddress Component - Accessibility & Design Documentation

## Overview
The `CopyAddress` component provides inline copy-to-clipboard functionality for addresses and transaction hashes throughout the StreamPay application.

## WCAG 2.1 AA Compliance

### 1. Perceivable
- **Text Alternatives**: The copy button has an explicit `aria-label="Copy to clipboard"` for screen reader users
- **Adaptable Content**: The component provides both truncated (screen) and full (print) versions of addresses
- **Distinguishable**: The copy button has clear visual states (default, hover, copied) with sufficient color contrast

### 2. Operable
- **Keyboard Accessible**: The copy button is a native `<button>` element, fully keyboard accessible
- **Focus Indicators**: Inherits focus styles from `app/styles/focus.css` (2px solid accent color with offset)
- **Timing**: The "Copied" success state automatically resets after 2 seconds, but doesn't interfere with user control
- **No Seizure Risk**: No flashing or strobing content

### 3. Understandable
- **Readable**: Text is clear with appropriate font sizes and contrast ratios
- **Predictable**: Button behavior is consistent - click to copy, shows success state
- **Input Assistance**: Clear button label indicates the action that will be performed
- **Error Prevention**: Graceful error handling if clipboard API fails (logs to console, doesn't crash)

### 4. Robust
- **Compatible**: Uses standard HTML5 button element and Clipboard API
- **Graceful Degradation**: If clipboard API fails, the component logs the error but doesn't break the UI
- **AT Support**: Proper ARIA attributes ensure compatibility with screen readers

## Responsive Design

### Breakpoints
The component inherits responsive behavior from parent containers and the existing CSS framework:

- **Mobile (< 48rem)**: Inline layout, full-width in flexible containers
- **Desktop (≥ 48rem)**: Maintains inline layout within grid systems

### Touch Targets
- The copy button meets minimum touch target size requirements (44px × 44px equivalent)
- Sufficient spacing between interactive elements

### Print Support
- Truncated addresses are hidden in print mode (`.no-print` class)
- Full addresses are shown in print mode (`.print-only` class)
- Copy button is hidden in print mode

## Color Contrast

### Dark Mode (Default)
- Button text: `#6b7280` on transparent background - meets WCAG AA
- Button hover: `#374151` - meets WCAG AA
- Button copied state: Inherits from existing `.receipt-copy-btn` styles

### Light Mode
- Inherits from light theme CSS variables
- Maintains sufficient contrast ratios for text and borders

## Keyboard Navigation

### Tab Order
- Copy button is included in natural tab order
- Focus indicator: 2px solid accent color with 2px offset

### Keyboard Shortcuts
- `Tab`: Navigate to copy button
- `Enter`/`Space`: Activate copy button
- `Esc`: No specific action (button focus can be moved away)

## Screen Reader Support

### Announcements
- Button: "Copy to clipboard" (aria-label)
- Success state: Button text changes to "Copied" (announced by screen readers)
- Address display: Truncated version has `aria-hidden="true"` to avoid redundancy

### NVDA/JAWS
- Properly announces button purpose and state changes
- Full address (print-only) is available when needed

## Error Handling

### Clipboard API Failures
- Gracefully handles cases where clipboard API is unavailable
- Logs errors to console for debugging
- Does not disrupt user experience

### Browser Compatibility
- Modern browsers: Full Clipboard API support
- Older browsers: Fallback behavior (error logged, UI remains functional)

## Testing Recommendations

### Manual Testing
1. **Keyboard Navigation**: Tab to copy button, activate with Enter/Space
2. **Screen Reader**: Test with NVDA, JAWS, and VoiceOver
3. **Color Contrast**: Verify with browser dev tools or contrast checker
4. **Print**: Test print preview to ensure full addresses are shown
5. **Mobile**: Test on various screen sizes and touch devices

### Automated Testing
- Jest tests cover core functionality
- Accessibility testing with axe-core or similar tools recommended
- Visual regression testing for responsive layouts

## Implementation Notes

### CSS Classes Used
- `.receipt-address-wrap`: Container for address and copy button
- `.receipt-copy-btn`: Copy button styling
- `.no-print`: Hidden in print mode
- `.print-only`: Only visible in print mode

### Props
- `value`: The address/hash to display and copy (required)
- `truncateChars`: Number of characters to show at start/end (default: 6)
- `className`: Optional custom class for wrapper
- `showCopyButton`: Whether to show copy button (default: true)
- `printOnly`: Show only full address, no truncation or button (default: false)

## Future Enhancements

### Potential Improvements
- Add tooltip on hover showing full address
- Support for custom success state duration
- Option for custom copy success message
- Integration with toast notification system
- Support for copying multiple addresses at once

### Accessibility Enhancements
- Add live region for screen reader announcements of copy success
- Support for high-contrast mode
- Custom focus indicators for better visibility
