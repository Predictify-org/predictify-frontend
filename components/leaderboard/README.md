# LeaderboardTable

`LeaderboardTable` supports optional responsive user avatars. A leaderboard user may provide an `avatarUrl`, `avatar`, `imageUrl`, or `image` value. When present, the table renders a native responsive image source set at 48px, 96px, and 192px widths and uses a mobile-aware `sizes` value so mobile browsers can select a smaller asset.

Avatars are marked decorative because the user's name is presented immediately beside the image. Users without an avatar source continue to render without a placeholder request.
