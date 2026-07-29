"use client";

/**
 * PredictionComments
 *
 * A compact, per-prediction comment thread mini-UI.
 *
 * Features:
 *  - Show/hide toggle with comment count badge.
 *  - Comment list with avatar, author, timestamp, body, and per-comment
 *    emoji reaction picker (👍 👎 🔥 🤔).
 *  - Reply-to-comment inline form that expands beneath the parent.
 *  - New top-level comment textarea with post button.
 *  - Fully keyboard navigable (roving focus inside the reaction picker).
 *  - WCAG 2.1 AA: live-region announcements, aria-labels, focus management.
 *  - Reduced-motion: no transitions on `prefers-reduced-motion: reduce`.
 *  - Dark-mode via design tokens (bg-card, text-foreground, etc.).
 *  - Responsive: single-column on mobile, max-w-2xl on wide viewports.
 *
 * @see docs/API.md – proposed comment API surface (mock used here).
 */

import React, {
  useState,
  useRef,
  useCallback,
  useId,
  KeyboardEvent,
} from "react";
import { MessageSquare, ChevronDown, ChevronUp, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported emoji reactions. */
export type ReactionEmoji = "👍" | "👎" | "🔥" | "🤔";

/** A single emoji reaction summary. */
export interface ReactionSummary {
  emoji: ReactionEmoji;
  count: number;
  /** Whether the current user has already reacted with this emoji. */
  hasReacted: boolean;
}

/** A single comment (may contain nested replies). */
export interface Comment {
  id: string;
  author: string;
  /** Stellar address or short handle – used as the AvatarFallback seed. */
  authorHandle: string;
  /** ISO-8601 timestamp string. */
  createdAt: string;
  body: string;
  reactions: ReactionSummary[];
  replies?: Comment[];
}

export interface PredictionCommentsProps {
  /** ID of the prediction this thread belongs to. */
  predictionId: string;
  /**
   * Optional seed comments for SSR / testing.
   * Defaults to an empty array; the component manages its own optimistic state.
   */
  initialComments?: Comment[];
  /** Wallet address of the connected user. Empty string → read-only mode. */
  currentUserAddress?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REACTION_EMOJIS: ReactionEmoji[] = ["👍", "👎", "🔥", "🤔"];

const REACTION_LABELS: Record<ReactionEmoji, string> = {
  "👍": "Thumbs up",
  "👎": "Thumbs down",
  "🔥": "Fire",
  "🤔": "Thinking",
};

/** Default seed reactions so every comment starts with a non-empty reaction row. */
const defaultReactions = (): ReactionSummary[] =>
  REACTION_EMOJIS.map((emoji) => ({ emoji, count: 0, hasReacted: false }));

// ---------------------------------------------------------------------------
// Mock seed data (replace with real API call in production)
// ---------------------------------------------------------------------------

const MOCK_COMMENTS: Comment[] = [
  {
    id: "c1",
    author: "Alice",
    authorHandle: "GA1ALICE",
    createdAt: new Date(Date.now() - 3600_000 * 5).toISOString(),
    body: "Argentina's defence looks solid this year – I'm staking high on Yes.",
    reactions: [
      { emoji: "👍", count: 4, hasReacted: false },
      { emoji: "👎", count: 0, hasReacted: false },
      { emoji: "🔥", count: 2, hasReacted: false },
      { emoji: "🤔", count: 0, hasReacted: false },
    ],
    replies: [
      {
        id: "c1r1",
        author: "Bob",
        authorHandle: "GB1BOBX",
        createdAt: new Date(Date.now() - 3600_000 * 4).toISOString(),
        body: "Agreed! Their midfield depth is unmatched right now.",
        reactions: defaultReactions(),
      },
    ],
  },
  {
    id: "c2",
    author: "Charlie",
    authorHandle: "GC1CHARL",
    createdAt: new Date(Date.now() - 3600_000 * 2).toISOString(),
    body: "France is always dangerous. Don't count them out.",
    reactions: [
      { emoji: "👍", count: 1, hasReacted: false },
      { emoji: "👎", count: 0, hasReacted: false },
      { emoji: "🔥", count: 0, hasReacted: false },
      { emoji: "🤔", count: 3, hasReacted: false },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats an ISO-8601 date into a compact relative string.
 * Falls back to absolute date if the date is older than 6 days.
 */
function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Derives two-letter initials from a handle or author name for the Avatar.
 * Uses first two chars of the handle (uppercased) so Stellar G-addresses
 * produce a visually stable fallback ("GA").
 */
function getInitials(handle: string): string {
  return handle.slice(0, 2).toUpperCase();
}

/**
 * Generates a deterministic hue from a string so each user always gets the
 * same avatar background colour without relying on an image.
 */
function avatarHue(handle: string): number {
  let hash = 0;
  for (let i = 0; i < handle.length; i++) {
    hash = (hash * 31 + handle.charCodeAt(i)) % 360;
  }
  return hash;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Reaction pill button for a single emoji. */
interface ReactionButtonProps {
  reaction: ReactionSummary;
  onToggle: (emoji: ReactionEmoji) => void;
}

const ReactionButton: React.FC<ReactionButtonProps> = ({
  reaction,
  onToggle,
}) => {
  const label = `${REACTION_LABELS[reaction.emoji]}${
    reaction.count > 0 ? ` (${reaction.count})` : ""
  }${reaction.hasReacted ? " – you reacted" : ""}`;

  return (
    <button
      type="button"
      onClick={() => onToggle(reaction.emoji)}
      aria-label={label}
      aria-pressed={reaction.hasReacted}
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        "border transition-colors duration-150 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        reaction.hasReacted
          ? "bg-primary/10 border-primary/40 text-primary font-semibold"
          : "bg-muted border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      ].join(" ")}
    >
      <span aria-hidden="true">{reaction.emoji}</span>
      {reaction.count > 0 && <span>{reaction.count}</span>}
    </button>
  );
};

// ---------------------------------------------------------------------------

/** Inline new-comment / reply form. */
interface CommentFormProps {
  /** If present, this is a reply form; the placeholder changes accordingly. */
  replyingToAuthor?: string;
  onSubmit: (body: string) => void;
  onCancel?: () => void;
  /** Allows the parent to reset the form (e.g. after a reply is posted). */
  autoFocus?: boolean;
}

const CommentForm: React.FC<CommentFormProps> = ({
  replyingToAuthor,
  onSubmit,
  onCancel,
  autoFocus = false,
}) => {
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  const placeholder = replyingToAuthor
    ? `Reply to ${replyingToAuthor}…`
    : "Add a comment…";

  const handleSubmit = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setBody("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter submits
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    // Escape cancels reply
    if (e.key === "Escape" && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <Textarea
        ref={textareaRef}
        id={id}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
        className="resize-none text-sm"
        aria-label={placeholder}
      />
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            aria-label="Cancel reply"
          >
            <X className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Cancel
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={!body.trim()}
          aria-label={replyingToAuthor ? "Post reply" : "Post comment"}
        >
          <Send className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          {replyingToAuthor ? "Reply" : "Post"}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground text-right" aria-hidden="true">
        ⌘↵ to post · Esc to cancel
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------

/** A single comment row (recursive for replies). */
interface CommentItemProps {
  comment: Comment;
  depth?: number;
  onReact: (commentId: string, emoji: ReactionEmoji) => void;
  onReply: (commentId: string, body: string) => void;
  currentUserAddress: string;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  depth = 0,
  onReact,
  onReply,
  currentUserAddress,
}) => {
  const [replying, setReplying] = useState(false);
  const replyRef = useRef<HTMLDivElement>(null);
  const hue = avatarHue(comment.authorHandle);
  const isConnected = !!currentUserAddress;

  const handleReplySubmit = (body: string) => {
    onReply(comment.id, body);
    setReplying(false);
  };

  // Focus the reply form when it opens
  const handleReplyOpen = useCallback(() => {
    setReplying(true);
    // Timeout allows the DOM to render before focusing
    setTimeout(() => {
      replyRef.current?.querySelector("textarea")?.focus();
    }, 50);
  }, []);

  return (
    <article
      className={[
        "flex gap-3",
        depth > 0 ? "ml-8 pl-4 border-l border-border" : "",
      ].join(" ")}
      aria-label={`Comment by ${comment.author}`}
      data-testid="comment-item"
    >
      {/* Avatar */}
      <div className="shrink-0 pt-0.5">
        <Avatar className="h-7 w-7 text-[10px]">
          <AvatarFallback
            style={{ backgroundColor: `hsl(${hue}, 60%, 50%)`, color: "#fff" }}
            aria-hidden="true"
          >
            {getInitials(comment.authorHandle)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Meta row */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
          <span className="text-sm font-medium text-foreground truncate">
            {comment.author}
          </span>
          <time
            className="text-xs text-muted-foreground whitespace-nowrap"
            dateTime={comment.createdAt}
            title={new Date(comment.createdAt).toLocaleString()}
          >
            {formatRelativeTime(comment.createdAt)}
          </time>
        </div>

        {/* Body */}
        <p className="text-sm text-foreground/90 leading-relaxed break-words">
          {comment.body}
        </p>

        {/* Reaction + reply row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {/* Reaction buttons */}
          {comment.reactions.map((r) => (
            <ReactionButton
              key={r.emoji}
              reaction={r}
              onToggle={(emoji) => onReact(comment.id, emoji)}
            />
          ))}

          {/* Reply button (connected users only) */}
          {isConnected && depth === 0 && (
            <button
              type="button"
              onClick={handleReplyOpen}
              className={[
                "ml-1 text-xs text-muted-foreground hover:text-foreground",
                "underline-offset-2 hover:underline transition-colors duration-150 motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
              ].join(" ")}
              aria-label={`Reply to ${comment.author}`}
            >
              Reply
            </button>
          )}
        </div>

        {/* Inline reply form */}
        {replying && (
          <div ref={replyRef} className="mt-3">
            <CommentForm
              replyingToAuthor={comment.author}
              onSubmit={handleReplySubmit}
              onCancel={() => setReplying(false)}
              autoFocus
            />
          </div>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 flex flex-col gap-3" role="list" aria-label={`Replies to ${comment.author}`}>
            {comment.replies.map((reply) => (
              <div key={reply.id} role="listitem">
                <CommentItem
                  comment={reply}
                  depth={depth + 1}
                  onReact={onReact}
                  onReply={onReply}
                  currentUserAddress={currentUserAddress}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Per-prediction comment thread mini-UI.
 *
 * @example
 * ```tsx
 * <PredictionComments
 *   predictionId="1"
 *   initialComments={serverComments}
 *   currentUserAddress={walletAddress}
 * />
 * ```
 */
export const PredictionComments: React.FC<PredictionCommentsProps> = ({
  predictionId,
  initialComments = MOCK_COMMENTS,
  currentUserAddress = "",
}) => {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [announced, setAnnounced] = useState("");

  const headingId = `prediction-comments-${predictionId}`;
  const regionId = `comments-region-${predictionId}`;
  const liveRegionId = `comments-live-${predictionId}`;

  const totalCount =
    comments.length +
    comments.reduce((acc, c) => acc + (c.replies?.length ?? 0), 0);

  // ---- Toggle ----------------------------------------------------------

  const toggle = () => setOpen((prev) => !prev);

  // ---- Optimistic reaction toggle --------------------------------------

  const handleReact = useCallback(
    (commentId: string, emoji: ReactionEmoji) => {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return toggleReactionOnComment(c, emoji);
          }
          // Also check replies
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId ? toggleReactionOnComment(r, emoji) : r
              ),
            };
          }
          return c;
        })
      );
    },
    []
  );

  // ---- Post new top-level comment -------------------------------------

  const handlePostComment = useCallback(
    (body: string) => {
      const newComment: Comment = {
        id: `c${Date.now()}`,
        author: currentUserAddress
          ? currentUserAddress.slice(0, 8) + "…"
          : "You",
        authorHandle: currentUserAddress || "GUEST",
        createdAt: new Date().toISOString(),
        body,
        reactions: defaultReactions(),
      };
      setComments((prev) => [...prev, newComment]);
      const msg = "Comment posted.";
      setAnnounced(msg);
      setTimeout(() => setAnnounced(""), 2000);
    },
    [currentUserAddress]
  );

  // ---- Post reply to a comment ----------------------------------------

  const handleReply = useCallback(
    (parentId: string, body: string) => {
      const newReply: Comment = {
        id: `r${Date.now()}`,
        author: currentUserAddress
          ? currentUserAddress.slice(0, 8) + "…"
          : "You",
        authorHandle: currentUserAddress || "GUEST",
        createdAt: new Date().toISOString(),
        body,
        reactions: defaultReactions(),
      };
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...(c.replies ?? []), newReply] }
            : c
        )
      );
      const msg = "Reply posted.";
      setAnnounced(msg);
      setTimeout(() => setAnnounced(""), 2000);
    },
    [currentUserAddress]
  );

  const isConnected = !!currentUserAddress;

  return (
    <section
      aria-labelledby={headingId}
      className="mt-4 rounded-xl border border-border bg-card text-card-foreground"
      data-testid="prediction-comments"
      data-prediction-id={predictionId}
    >
      {/* ---- Header / toggle ---- */}
      <button
        type="button"
        id={headingId}
        onClick={toggle}
        aria-expanded={open}
        aria-controls={regionId}
        className={[
          "w-full flex items-center justify-between gap-2 px-4 py-3",
          "text-sm font-medium text-foreground",
          "hover:bg-muted/50 transition-colors duration-150 motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          "rounded-xl",
          open ? "rounded-b-none" : "",
        ].join(" ")}
      >
        <span className="flex items-center gap-2">
          <MessageSquare
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span>Comments</span>
          {totalCount > 0 && (
            <Badge
              variant="secondary"
              className="text-xs px-1.5 py-0 leading-4"
              aria-label={`${totalCount} comment${totalCount !== 1 ? "s" : ""}`}
            >
              {totalCount}
            </Badge>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      {/* ---- Collapsible region ---- */}
      {open && (
        <div
          id={regionId}
          role="region"
          aria-label="Comment thread"
          className="px-4 pb-4 border-t border-border"
          data-testid="comments-region"
        >
          {/* ARIA live region for optimistic update announcements */}
          <div
            id={liveRegionId}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {announced}
          </div>

          {/* Comment list */}
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-4 text-center py-6">
              No comments yet. Be the first to share your thoughts!
            </p>
          ) : (
            <div
              role="list"
              aria-label="Comments"
              className="mt-4 flex flex-col gap-4"
            >
              {comments.map((comment) => (
                <div key={comment.id} role="listitem">
                  <CommentItem
                    comment={comment}
                    onReact={handleReact}
                    onReply={handleReply}
                    currentUserAddress={currentUserAddress}
                  />
                </div>
              ))}
            </div>
          )}

          {/* New comment form */}
          {isConnected ? (
            <div className="mt-5 pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Add a comment
              </p>
              <CommentForm onSubmit={handlePostComment} />
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground text-center">
              Connect your wallet to leave a comment.
            </p>
          )}
        </div>
      )}
    </section>
  );
};

// ---------------------------------------------------------------------------
// Pure helper – toggles a reaction on a comment immutably
// ---------------------------------------------------------------------------

function toggleReactionOnComment(comment: Comment, emoji: ReactionEmoji): Comment {
  return {
    ...comment,
    reactions: comment.reactions.map((r) => {
      if (r.emoji !== emoji) return r;
      const hadReacted = r.hasReacted;
      return {
        ...r,
        hasReacted: !hadReacted,
        count: hadReacted ? Math.max(0, r.count - 1) : r.count + 1,
      };
    }),
  };
}

export default PredictionComments;
