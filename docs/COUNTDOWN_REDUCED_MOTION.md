# Countdown Reduced Motion

`CountdownTimer` respects `prefers-reduced-motion: reduce`.

Default users see the existing tabular second-by-second countdown. Reduced-motion
users see a stable text label such as `2 days, 3 hours remaining` instead of the
ticking numeric display. Urgent timers keep the destructive color, but the pulse
animation is removed.

The screen-reader live region remains coarse-grained, so assistive technology is
not asked to announce every second.
