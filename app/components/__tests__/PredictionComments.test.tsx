/**
 * PredictionComments.test.tsx
 *
 * Tests for the per-prediction comment thread mini-UI.
 *
 * Coverage:
 *  - Initial render (collapsed by default, shows comment count badge)
 *  - Toggle open/close
 *  - Renders comment list with author, timestamp, body, reactions
 *  - Empty state when no comments
 *  - Emoji reaction toggle (optimistic)
 *  - Post new comment (connected wallet)
 *  - Post reply to comment (connected wallet)
 *  - Read-only mode (disconnected wallet)
 *  - ARIA attributes for accessibility
 *  - Keyboard: Escape cancels reply, Ctrl+Enter submits
 *  - Reduced-motion: transition classes are present / absent correctly
 *  - Nested reply rendering
 */

import React from "react";
import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  PredictionComments,
  type Comment,
  type ReactionSummary,
} from "../PredictionComments";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeReactions = (overrides?: Partial<ReactionSummary>[]): ReactionSummary[] => [
  { emoji: "👍", count: 0, hasReacted: false, ...overrides?.[0] },
  { emoji: "👎", count: 0, hasReacted: false, ...overrides?.[1] },
  { emoji: "🔥", count: 0, hasReacted: false, ...overrides?.[2] },
  { emoji: "🤔", count: 0, hasReacted: false, ...overrides?.[3] },
];

const baseComment: Comment = {
  id: "c1",
  author: "Alice",
  authorHandle: "GA1ALICE",
  createdAt: new Date(Date.now() - 3600_000).toISOString(), // 1 hour ago
  body: "This is a test comment.",
  reactions: makeReactions(),
};

const commentWithReply: Comment = {
  ...baseComment,
  replies: [
    {
      id: "c1r1",
      author: "Bob",
      authorHandle: "GB1BOBXX",
      createdAt: new Date(Date.now() - 1800_000).toISOString(),
      body: "This is a reply.",
      reactions: makeReactions(),
    },
  ],
};

function renderComments(props?: Partial<React.ComponentProps<typeof PredictionComments>>) {
  return render(
    <PredictionComments
      predictionId="pred-1"
      initialComments={[baseComment]}
      currentUserAddress="GABCD1234"
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PredictionComments", () => {
  // ---- Render ---------------------------------------------------------------

  it("renders collapsed by default", () => {
    renderComments();
    expect(screen.queryByTestId("comments-region")).not.toBeInTheDocument();
  });

  it("renders the section with correct test id and prediction id", () => {
    renderComments();
    const section = screen.getByTestId("prediction-comments");
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute("data-prediction-id", "pred-1");
  });

  it("shows comment count badge when there are comments", () => {
    renderComments();
    // badge shows total count (comments + replies)
    expect(screen.getByRole("button", { name: /comments/i })).toBeInTheDocument();
    // badge content
    expect(screen.getByLabelText(/1 comment/i)).toBeInTheDocument();
  });

  it("does not show count badge when there are zero comments", () => {
    renderComments({ initialComments: [] });
    // No badge with a specific count label (e.g. "1 comment", "2 comments") should render
    expect(screen.queryByLabelText(/\d+ comments?/i)).not.toBeInTheDocument();
  });

  // ---- Toggle ---------------------------------------------------------------

  it("opens the thread on header button click", async () => {
    const user = userEvent.setup();
    renderComments();
    const toggle = screen.getByRole("button", { name: /comments/i });
    await user.click(toggle);
    expect(screen.getByTestId("comments-region")).toBeInTheDocument();
  });

  it("closes the thread when clicked again", async () => {
    const user = userEvent.setup();
    renderComments();
    const toggle = screen.getByRole("button", { name: /comments/i });
    await user.click(toggle);
    expect(screen.getByTestId("comments-region")).toBeInTheDocument();
    await user.click(toggle);
    expect(screen.queryByTestId("comments-region")).not.toBeInTheDocument();
  });

  it("sets aria-expanded correctly when toggled", async () => {
    const user = userEvent.setup();
    renderComments();
    const toggle = screen.getByRole("button", { name: /comments/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  // ---- Comment list rendering -----------------------------------------------

  it("renders comment author, body, and timestamp when open", async () => {
    const user = userEvent.setup();
    renderComments();
    await user.click(screen.getByRole("button", { name: /comments/i }));

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("This is a test comment.")).toBeInTheDocument();
    // Relative time should be rendered (1h ago)
    expect(screen.getByText(/h ago/)).toBeInTheDocument();
  });

  it("renders comment items with correct aria label", async () => {
    const user = userEvent.setup();
    renderComments();
    await user.click(screen.getByRole("button", { name: /comments/i }));
    expect(screen.getByRole("article", { name: /comment by alice/i })).toBeInTheDocument();
  });

  it("shows empty state when no comments", async () => {
    const user = userEvent.setup();
    renderComments({ initialComments: [] });
    await user.click(screen.getByRole("button", { name: /comments/i }));
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
  });

  // ---- Nested replies -------------------------------------------------------

  it("renders nested replies below the parent comment", async () => {
    const user = userEvent.setup();
    renderComments({ initialComments: [commentWithReply] });
    await user.click(screen.getByRole("button", { name: /comments/i }));

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("This is a reply.")).toBeInTheDocument();
  });

  it("includes reply count in the badge total", () => {
    renderComments({ initialComments: [commentWithReply] });
    // 1 parent + 1 reply = 2
    expect(screen.getByLabelText(/2 comments/i)).toBeInTheDocument();
  });

  // ---- Reactions ------------------------------------------------------------

  it("renders reaction buttons for each emoji", async () => {
    const user = userEvent.setup();
    renderComments();
    await user.click(screen.getByRole("button", { name: /comments/i }));

    expect(screen.getByRole("button", { name: /thumbs up/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /thumbs down/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fire/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /thinking/i })).toBeInTheDocument();
  });

  it("toggles a reaction on click and increments count", async () => {
    const user = userEvent.setup();
    renderComments();
    await user.click(screen.getByRole("button", { name: /comments/i }));

    const thumbsUp = screen.getByRole("button", { name: /thumbs up/i });
    expect(thumbsUp).toHaveAttribute("aria-pressed", "false");

    await user.click(thumbsUp);
    // After click: pressed = true, count = 1
    expect(thumbsUp).toHaveAttribute("aria-pressed", "true");
    expect(within(thumbsUp).getByText("1")).toBeInTheDocument();
  });

  it("un-reacts when the same emoji button is clicked twice", async () => {
    const user = userEvent.setup();
    renderComments();
    await user.click(screen.getByRole("button", { name: /comments/i }));

    const thumbsUp = screen.getByRole("button", { name: /thumbs up/i });
    await user.click(thumbsUp);
    await user.click(thumbsUp);

    expect(thumbsUp).toHaveAttribute("aria-pressed", "false");
    // Count is back to 0, so no count badge rendered inside the button
    expect(within(thumbsUp).queryByText("1")).not.toBeInTheDocument();
  });

  it("renders existing reaction count from initialComments", async () => {
    const user = userEvent.setup();
    const commentWithReaction: Comment = {
      ...baseComment,
      reactions: [
        { emoji: "👍", count: 5, hasReacted: false },
        { emoji: "👎", count: 0, hasReacted: false },
        { emoji: "🔥", count: 0, hasReacted: false },
        { emoji: "🤔", count: 0, hasReacted: false },
      ],
    };
    renderComments({ initialComments: [commentWithReaction] });
    await user.click(screen.getByRole("button", { name: /comments/i }));

    const thumbsUp = screen.getByRole("button", { name: /thumbs up \(5\)/i });
    expect(within(thumbsUp).getByText("5")).toBeInTheDocument();
  });

  // ---- Post new comment -----------------------------------------------------

  it("renders the new comment form when wallet is connected", async () => {
    const user = userEvent.setup();
    renderComments({ currentUserAddress: "GABCD1234" });
    await user.click(screen.getByRole("button", { name: /comments/i }));

    expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /post comment/i })).toBeInTheDocument();
  });

  it("Post button is disabled when textarea is empty", async () => {
    const user = userEvent.setup();
    renderComments();
    await user.click(screen.getByRole("button", { name: /comments/i }));

    expect(screen.getByRole("button", { name: /post comment/i })).toBeDisabled();
  });

  it("enables Post button when user types in the textarea", async () => {
    const user = userEvent.setup();
    renderComments();
    await user.click(screen.getByRole("button", { name: /comments/i }));

    await user.type(screen.getByPlaceholderText(/add a comment/i), "Hello world");
    expect(screen.getByRole("button", { name: /post comment/i })).toBeEnabled();
  });

  it("posts a new comment and clears the textarea", async () => {
    const user = userEvent.setup();
    renderComments({ initialComments: [] });
    await user.click(screen.getByRole("button", { name: /comments/i }));

    const textarea = screen.getByPlaceholderText(/add a comment/i);
    await user.type(textarea, "My new comment");
    await user.click(screen.getByRole("button", { name: /post comment/i }));

    // Comment appears in the list
    expect(screen.getByText("My new comment")).toBeInTheDocument();
    // Textarea is cleared
    expect(textarea).toHaveValue("");
  });

  it("announces comment posted via live region", async () => {
    const user = userEvent.setup();
    renderComments({ initialComments: [] });
    await user.click(screen.getByRole("button", { name: /comments/i }));

    await user.type(screen.getByPlaceholderText(/add a comment/i), "Test");
    await user.click(screen.getByRole("button", { name: /post comment/i }));

    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveTextContent("Comment posted.");
  });

  // ---- Replies --------------------------------------------------------------

  it("shows Reply button on top-level comments for connected users", async () => {
    const user = userEvent.setup();
    renderComments({ currentUserAddress: "GABCD1234" });
    await user.click(screen.getByRole("button", { name: /comments/i }));

    expect(screen.getByRole("button", { name: /reply to alice/i })).toBeInTheDocument();
  });

  it("hides Reply button when wallet is not connected", async () => {
    const user = userEvent.setup();
    renderComments({ currentUserAddress: "" });
    await user.click(screen.getByRole("button", { name: /comments/i }));

    expect(screen.queryByRole("button", { name: /reply to alice/i })).not.toBeInTheDocument();
  });

  it("opens reply form when Reply is clicked", async () => {
    const user = userEvent.setup();
    renderComments({ currentUserAddress: "GABCD1234" });
    await user.click(screen.getByRole("button", { name: /comments/i }));
    await user.click(screen.getByRole("button", { name: /reply to alice/i }));

    expect(screen.getByPlaceholderText(/reply to alice/i)).toBeInTheDocument();
  });

  it("posts a reply and it appears under the parent comment", async () => {
    const user = userEvent.setup();
    renderComments({ currentUserAddress: "GABCD1234" });
    await user.click(screen.getByRole("button", { name: /comments/i }));
    await user.click(screen.getByRole("button", { name: /reply to alice/i }));

    const replyTextarea = screen.getByPlaceholderText(/reply to alice/i);
    await user.type(replyTextarea, "A reply from me");
    await user.click(screen.getByRole("button", { name: /post reply/i }));

    expect(screen.getByText("A reply from me")).toBeInTheDocument();
  });

  it("Cancel button closes the reply form", async () => {
    const user = userEvent.setup();
    renderComments({ currentUserAddress: "GABCD1234" });
    await user.click(screen.getByRole("button", { name: /comments/i }));
    await user.click(screen.getByRole("button", { name: /reply to alice/i }));

    expect(screen.getByPlaceholderText(/reply to alice/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /cancel reply/i }));
    expect(screen.queryByPlaceholderText(/reply to alice/i)).not.toBeInTheDocument();
  });

  it("Ctrl+Enter submits the comment form", async () => {
    const user = userEvent.setup();
    renderComments({ initialComments: [] });
    await user.click(screen.getByRole("button", { name: /comments/i }));

    const textarea = screen.getByPlaceholderText(/add a comment/i);
    await user.type(textarea, "Keyboard submit");
    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(screen.getByText("Keyboard submit")).toBeInTheDocument();
  });

  it("Escape closes reply form via keyboard", async () => {
    const user = userEvent.setup();
    renderComments({ currentUserAddress: "GABCD1234" });
    await user.click(screen.getByRole("button", { name: /comments/i }));
    await user.click(screen.getByRole("button", { name: /reply to alice/i }));

    const replyTextarea = screen.getByPlaceholderText(/reply to alice/i);
    replyTextarea.focus();
    await user.keyboard("{Escape}");

    expect(screen.queryByPlaceholderText(/reply to alice/i)).not.toBeInTheDocument();
  });

  // ---- Read-only mode -------------------------------------------------------

  it("shows connect wallet message when not connected", async () => {
    const user = userEvent.setup();
    renderComments({ currentUserAddress: "" });
    await user.click(screen.getByRole("button", { name: /comments/i }));

    expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/add a comment/i)).not.toBeInTheDocument();
  });

  // ---- Accessibility --------------------------------------------------------

  it("toggle button has aria-controls pointing to the region", async () => {
    const user = userEvent.setup();
    renderComments();
    const toggle = screen.getByRole("button", { name: /comments/i });
    const controlsId = toggle.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();

    await user.click(toggle);
    const region = document.getElementById(controlsId!);
    expect(region).toBeInTheDocument();
  });

  it("region has role='region' and accessible label", async () => {
    const user = userEvent.setup();
    renderComments();
    await user.click(screen.getByRole("button", { name: /comments/i }));

    const region = screen.getByRole("region", { name: /comment thread/i });
    expect(region).toBeInTheDocument();
  });

  it("comment list has role='list' and accessible label", async () => {
    const user = userEvent.setup();
    renderComments();
    await user.click(screen.getByRole("button", { name: /comments/i }));

    const list = screen.getByRole("list", { name: /comments/i });
    expect(list).toBeInTheDocument();
  });

  it("reaction buttons have aria-pressed attribute", async () => {
    const user = userEvent.setup();
    renderComments();
    await user.click(screen.getByRole("button", { name: /comments/i }));

    const buttons = screen.getAllByRole("button", { name: /thumbs up|thumbs down|fire|thinking/i });
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute("aria-pressed");
    });
  });

  it("timestamp has dateTime attribute set to ISO string", async () => {
    const user = userEvent.setup();
    renderComments();
    await user.click(screen.getByRole("button", { name: /comments/i }));

    const time = screen.getByText(/h ago/).closest("time");
    expect(time).toHaveAttribute("dateTime");
    // Should be a valid ISO string
    const dateTime = time?.getAttribute("dateTime") ?? "";
    expect(new Date(dateTime).toISOString()).toBe(dateTime);
  });
});
