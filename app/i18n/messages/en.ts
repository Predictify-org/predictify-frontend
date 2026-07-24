/**
 * English (en) — Base locale message catalog.
 *
 * This is the source-of-truth for all translatable strings in Predictify.
 * Every other locale file must supply a value for every key defined here.
 *
 * Naming conventions:
 *  - Keys use dot-separated namespaces: `"<namespace>.<identifier>"`
 *  - Use `{variable}` for runtime-interpolated values.
 *  - Keep values short and imperative where possible (UI copy).
 *  - Do NOT store HTML in values — compose JSX around translated strings.
 */
import type { Messages } from "../types";

const en: Messages = {
  // ── Navigation ──────────────────────────────────────────────────────────────
  "nav.dashboard": "Dashboard",
  "nav.events": "Events",
  "nav.predictions": "My Predictions",
  "nav.bets": "Active Bets",
  "nav.leaderboard": "Leaderboard",
  "nav.finances": "Finances",
  "nav.disputes": "Disputes",
  "nav.profile": "Profile",
  "nav.settings": "Settings",
  "nav.help": "Help",

  // ── Common actions ───────────────────────────────────────────────────────────
  "action.connect_wallet": "Connect Wallet",
  "action.disconnect": "Disconnect",
  "action.confirm": "Confirm",
  "action.cancel": "Cancel",
  "action.save": "Save",
  "action.close": "Close",
  "action.back": "Back",
  "action.next": "Next",
  "action.submit": "Submit",
  "action.retry": "Try Again",
  "action.copy": "Copy",
  "action.share": "Share",
  "action.view_all": "View All",
  "action.load_more": "Load More",

  // ── Common labels ────────────────────────────────────────────────────────────
  "label.loading": "Loading…",
  "label.error": "Something went wrong",
  "label.empty": "Nothing here yet",
  "label.required": "Required",
  "label.optional": "Optional",
  "label.search": "Search",
  "label.filter": "Filter",
  "label.sort": "Sort",
  "label.status": "Status",
  "label.amount": "Amount",
  "label.date": "Date",
  "label.network": "Network",
  "label.wallet": "Wallet",
  "label.address": "Address",
  "label.balance": "Balance",

  // ── Auth ────────────────────────────────────────────────────────────────────
  "auth.sign_in": "Sign In",
  "auth.sign_out": "Sign Out",
  "auth.connect_prompt": "Connect your Stellar wallet to get started.",
  "auth.wallet_required": "A connected wallet is required.",

  // ── Dashboard ────────────────────────────────────────────────────────────────
  "dashboard.title": "Dashboard",
  "dashboard.welcome": "Welcome back, {name}!",
  "dashboard.stats.total_predictions": "Total Predictions",
  "dashboard.stats.win_rate": "Win Rate",
  "dashboard.stats.total_earned": "Total Earned",
  "dashboard.stats.active_bets": "Active Bets",
  "dashboard.no_activity": "No recent activity to show.",

  // ── Events ──────────────────────────────────────────────────────────────────
  "events.title": "Events",
  "events.create": "Create Event",
  "events.empty": "No events found.",
  "events.filter.all": "All",
  "events.filter.open": "Open",
  "events.filter.closed": "Closed",
  "events.filter.resolved": "Resolved",
  "events.status.open": "Open",
  "events.status.closed": "Closed",
  "events.status.resolving": "Resolving",
  "events.status.resolved": "Resolved",
  "events.deadline": "Closes {date}",
  "events.participants": "{count} participants",

  // ── Predictions ──────────────────────────────────────────────────────────────
  "predictions.title": "My Predictions",
  "predictions.empty": "You haven't made any predictions yet.",
  "predictions.place_bet": "Place Bet",
  "predictions.outcome.yes": "Yes",
  "predictions.outcome.no": "No",
  "predictions.stake": "Stake",
  "predictions.potential_payout": "Potential Payout",
  "predictions.odds": "Odds",
  "predictions.result.won": "Won",
  "predictions.result.lost": "Lost",
  "predictions.result.pending": "Pending",

  // ── Wallet ──────────────────────────────────────────────────────────────────
  "wallet.connect_title": "Connect Wallet",
  "wallet.connect_description": "Choose a Stellar wallet to connect.",
  "wallet.connecting": "Connecting…",
  "wallet.connected": "Connected",
  "wallet.disconnected": "Disconnected",
  "wallet.copy_address": "Copy Address",
  "wallet.address_copied": "Address copied!",
  "wallet.network_testnet": "Testnet",
  "wallet.network_mainnet": "Mainnet",
  "wallet.error.not_found": "Wallet not found. Please install the extension.",
  "wallet.error.rejected": "Connection rejected.",
  "wallet.error.unknown": "An unknown wallet error occurred.",

  // ── Settings ────────────────────────────────────────────────────────────────
  "settings.title": "Settings",
  "settings.language.title": "Language",
  "settings.language.description":
    "Choose the language used throughout the Predictify interface.",
  "settings.language.active": "Active",
  "settings.language.saved_note":
    "Your preference is saved locally and applied immediately.",
  "settings.account.title": "Account",
  "settings.notifications.title": "Notifications",
  "settings.appearance.title": "Appearance",

  // ── Disputes ────────────────────────────────────────────────────────────────
  "disputes.title": "Disputes",
  "disputes.empty": "No disputes to review.",
  "disputes.status.open": "Open",
  "disputes.status.under_review": "Under Review",
  "disputes.status.resolved": "Resolved",
  "disputes.raise": "Raise Dispute",
  "disputes.evidence": "Evidence",

  // ── Finances ────────────────────────────────────────────────────────────────
  "finances.title": "Finances",
  "finances.deposit": "Deposit",
  "finances.withdraw": "Withdraw",
  "finances.transaction_history": "Transaction History",
  "finances.no_transactions": "No transactions yet.",

  // ── Profile ─────────────────────────────────────────────────────────────────
  "profile.title": "Profile",
  "profile.edit": "Edit Profile",
  "profile.share": "Share Profile",
  "profile.stats.predictions": "Predictions",
  "profile.stats.accuracy": "Accuracy",
  "profile.stats.earnings": "Earnings",

  // ── Errors / feedback ────────────────────────────────────────────────────────
  "error.generic": "Something went wrong. Please try again.",
  "error.network": "Network error. Check your connection.",
  "error.not_found": "Page not found.",
  "error.unauthorized": "You are not authorized to view this page.",
  "feedback.copied": "Copied!",
  "feedback.saved": "Saved.",
  "feedback.transaction_submitted": "Transaction submitted!",
  "feedback.transaction_confirmed": "Transaction confirmed.",
  "feedback.transaction_failed": "Transaction failed.",

  // ── Accessibility ────────────────────────────────────────────────────────────
  "a11y.menu_open": "Open menu",
  "a11y.menu_close": "Close menu",
  "a11y.theme_toggle": "Toggle theme",
  "a11y.language_select": "Select UI language",
  "a11y.close_dialog": "Close dialog",
  "a11y.loading": "Loading content, please wait.",
  "a11y.external_link": "Opens in a new tab",
};

export default en;
