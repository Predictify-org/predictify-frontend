import type { Metadata } from 'next'

type AuditItem = {
  component: string
  status: 'Verified' | 'Partial' | 'Needs follow-up'
  summary: string
  evidence: string[]
}

const auditItems: AuditItem[] = [
  {
    component: 'ConnectWalletModal',
    status: 'Verified',
    summary:
      'Provider labels, announced badge state, and recovery messaging are covered for assistive technologies.',
    evidence: ['components/connect-wallet-modal.tsx', 'components/__tests__/connect-wallet-modal.test.tsx'],
  },
  {
    component: 'Outcome icons and dispute voting states',
    status: 'Verified',
    summary:
      'Outcome affordances rely on text and shape cues rather than color alone, with decorative icon handling verified.',
    evidence: [
      'components/icons/OutcomeIcons.tsx',
      'components/icons/__tests__/OutcomeIcons.test.tsx',
      'components/disputes/shared/TallyBar.tsx',
    ],
  },
  {
    component: 'DisputeOutcomeExplainer',
    status: 'Verified',
    summary:
      'Dialog flow, math steps, and tally values are structured so the explanation remains readable at larger zoom levels.',
    evidence: [
      'components/disputes/DisputeOutcomeExplainer.tsx',
      'components/disputes/__tests__/DisputeOutcomeExplainer.test.tsx',
    ],
  },
  {
    component: 'ErrorRecoveryScreen',
    status: 'Verified',
    summary:
      'Recovery actions, incident copy, and escape paths are all available through keyboard and screen-reader friendly patterns.',
    evidence: [
      'components/error/ErrorRecoveryScreen.tsx',
      'components/error/ErrorRecoveryScreen.test.tsx',
      'components/error-boundary.tsx',
    ],
  },
  {
    component: 'VirtualizedEventsList',
    status: 'Verified',
    summary:
      'Keyboard focus visibility, loading messaging, and scroll restoration remain intact during large-list navigation.',
    evidence: [
      'components/events/virtualized-events-list.tsx',
      'components/events/__tests__/virtualized-events-list.integration.test.tsx',
    ],
  },
  {
    component: 'New event form focus order',
    status: 'Partial',
    summary:
      'Early tab order is covered, but the full form sequence still needs a broader review for keyboard continuity.',
    evidence: ['app/(dashboard)/events/new/page.tsx', 'app/(dashboard)/events/new/page.test.tsx'],
  },
  {
    component: 'Focus-visible CSS layer',
    status: 'Verified',
    summary:
      'Global focus rings remain visible in dark mode and are paired with strong contrast for interactive surfaces.',
    evidence: ['app/styles/focus.css', 'app/globals.css', 'app/__tests__/focus-visible.test.js'],
  },
  {
    component: 'SkipToContent',
    status: 'Verified',
    summary:
      'WCAG 2.1 AA SC 2.4.1 (Bypass Blocks). First focusable link on pages, bypasses standard headers to main content.',
    evidence: [
      'app/components/SkipToContent.tsx',
      'app/components/__tests__/SkipToContent.test.tsx',
      'app/layout.tsx',
      'app/(dashboard)/layout.tsx',
      'app/(marketing)/layout.tsx',
    ],
  },
  {
    component: 'MobileBottomTabs badge',
    status: 'Verified',
    summary:
      'WCAG 2.1 AA SC 1.4.11 and 4.1.3 satisfied. Custom red badge shows unread counts visually while aria-labels announce unread status.',
    evidence: [
      'components/navbar/MobileBottomTabs.tsx',
      'components/navbar/__tests__/MobileBottomTabs.test.tsx',
    ],
  },
  {
    component: 'AboutMarketModal',
    status: 'Verified',
    summary:
      'Modal uses DialogContentWithFocusReturn to restore focus on close, provides full keyboard support, and uses custom sr-only descriptions for screen readers.',
    evidence: [
      'app/components/AboutMarketModal.tsx',
      'app/components/__tests__/AboutMarketModal.test.tsx',
    ],
  },
  {
    component: 'Dashboard interactive elements (#484)',
    status: 'Verified',
    summary:
      'Keyboard-only focus outlines are now visible on all Dashboard interactive surfaces: notification items, activity timeline group headers, recommendation cards, recently viewed links, and inline market title links.',
    evidence: [
      'app/(dashboard)/dashboard/page.tsx',
      'app/dashboard/NotifDigest.tsx',
      'components/activity-timeline/activity-timeline.tsx',
      'components/dashboard/RecommendationsStrip.tsx',
      'app/components/RecentlyViewedRail.tsx',
      'app/dashboard/NotifDigest.test.tsx',
      'components/activity-timeline/__tests__/activity-timeline.test.tsx',
      'components/dashboard/__tests__/RecommendationsStrip.test.tsx',
      'app/components/__tests__/RecentlyViewedRail.test.tsx',
    ],
  },
]

const statusStyles: Record<AuditItem['status'], string> = {
  Verified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  Partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  'Needs follow-up': 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
}

export const metadata: Metadata = {
  title: 'Accessibility audit board',
  description: 'Internal GrantFox accessibility audit board for WCAG 2.1 AA review status.',
}

export default function A11yAuditPage() {
  const verifiedCount = auditItems.filter((item) => item.status === 'Verified').length
  const partialCount = auditItems.filter((item) => item.status === 'Partial').length
  const followUpCount = auditItems.filter((item) => item.status === 'Needs follow-up').length

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="space-y-4">
          <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            Internal accessibility board
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Accessibility audit board
            </h1>
            <p className="max-w-3xl text-lg text-slate-600 dark:text-slate-300">
              GrantFox-facing surfaces are tracked here for WCAG 2.1 AA readiness, with focused evidence for each component.
            </p>
          </div>
        </header>

        <section aria-label="Board summary" className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Verified</p>
            <p className="mt-2 text-3xl font-semibold">{verifiedCount}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Partial</p>
            <p className="mt-2 text-3xl font-semibold">{partialCount}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Needs follow-up</p>
            <p className="mt-2 text-3xl font-semibold">{followUpCount}</p>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-6 dark:border-slate-800">
            <h2 className="text-xl font-semibold">AA status by component</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Status is based on implementation evidence and targeted audit coverage.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table
              className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800"
              aria-labelledby="audit-board-caption"
            >
              <caption id="audit-board-caption" className="sr-only">
                GrantFox accessibility audit board
              </caption>
              <thead className="bg-slate-50 text-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Component
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    What was verified
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Evidence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {auditItems.map((item) => (
                  <tr key={item.component} className="align-top">
                    <td className="px-6 py-5 font-medium text-slate-900 dark:text-slate-100">
                      {item.component}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="max-w-xl px-6 py-5 text-slate-600 dark:text-slate-300">
                      {item.summary}
                    </td>
                    <td className="px-6 py-5">
                      <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-300">
                        {item.evidence.map((piece) => (
                          <li key={piece}>{piece}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-100/80 p-6 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
          <h2 className="text-base font-semibold">How to use this board</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Use the status values as a quick review summary before shipping a GrantFox-facing change.</li>
            <li>Pair any “Partial” item with a follow-up pass for keyboard and screen-reader behavior.</li>
            <li>Keep the evidence list in sync with the implementation and test files when the component changes.</li>
          </ul>
        </section>
      </div>
    </main>
  )
}
