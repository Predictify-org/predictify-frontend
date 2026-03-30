"use client";

import React, { useState } from "react";
import { ActivityTimeline } from "@/components/activity-timeline";
import { generateMockActivities } from "@/lib/activity-timeline";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Activity Timeline Demo Page
 * Showcases different states and variations of the activity timeline component
 */
export default function ActivityTimelineDemo() {
  const [loadMoreCount, setLoadMoreCount] = useState(0);

  const handleLoadMore = () => {
    setLoadMoreCount((prev) => prev + 1);
  };

  // Generate different datasets for demo
  const defaultActivities = generateMockActivities(12);
  const expandedActivities = generateMockActivities(24);
  const smallActivities = generateMockActivities(3);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Activity Timeline Design System
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Lifecycle event patterns with intelligent grouping and collapse rules
          </p>
        </div>

        {/* Tabs for different states */}
        <Tabs defaultValue="default" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 gap-2">
            <TabsTrigger value="default" className="text-xs sm:text-sm">Default</TabsTrigger>
            <TabsTrigger value="expanded" className="text-xs sm:text-sm">Expanded</TabsTrigger>
            <TabsTrigger value="empty" className="text-xs sm:text-sm">Empty</TabsTrigger>
            <TabsTrigger value="error" className="text-xs sm:text-sm">Error</TabsTrigger>
            <TabsTrigger value="loading" className="text-xs sm:text-sm">Loading</TabsTrigger>
          </TabsList>

          {/* Default State */}
          <TabsContent value="default" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Default View (Grouped & Collapsed)</CardTitle>
                <CardDescription>
                  Events are grouped by type with noisy events automatically collapsed.
                  Click to expand groups to see all events.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityTimeline
                  activities={defaultActivities}
                  pageSize={6}
                  onLoadMore={handleLoadMore}
                />
                {loadMoreCount > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                    Loaded {loadMoreCount * 6} additional activities
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Key Features */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base">✨ Features in This View</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>• Events grouped by type (Predictions, Events, Disputes, etc.)</p>
                <p>• Noisy event groups (3+ events) collapsed by default</p>
                <p>• Collapsible headers with event count</p>
                <p>• Relative timestamps ("2 hours ago", "Yesterday")</p>
                <p>• Load more pagination for older activities</p>
                <p>• Color-coded group indicators</p>
                <p>• Transaction amounts displayed for financial events</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expanded State */}
          <TabsContent value="expanded" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Expanded View (All Groups Open)</CardTitle>
                <CardDescription>
                  All activity groups are expanded to show individual events in detail.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityTimeline activities={expandedActivities} pageSize={10} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Empty State */}
          <TabsContent value="empty" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Empty State</CardTitle>
                <CardDescription>
                  Shown when user has no activities yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityTimeline activities={[]} />
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border-amber-200">
              <CardHeader>
                <CardTitle className="text-base">💡 Design Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>• Clear icon communicates empty state</p>
                <p>• Helpful description guides user action</p>
                <p>• Call-to-action button (Get Started)</p>
                <p>• Adequate whitespace and hierarchy</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Error State */}
          <TabsContent value="error" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Error State</CardTitle>
                <CardDescription>
                  Shown when activity fetch fails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityTimeline
                  activities={[]}
                  error="Failed to fetch activity timeline. Please check your connection and try again."
                  onLoadMore={() => console.log("retry")}
                />
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border-amber-200">
              <CardHeader>
                <CardTitle className="text-base">💡 Design Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>• Error icon clearly indicates problem</p>
                <p>• Clear error message helps users understand issue</p>
                <p>• Technical error details in monospace for debugging</p>
                <p>• Retry button allows recovery without page reload</p>
                <p>• Distinct visual treatment (red border, red background)</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loading State */}
          <TabsContent value="loading" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Loading State</CardTitle>
                <CardDescription>
                  Shown while activities are being fetched
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityTimeline activities={[]} isLoading={true} />
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border-amber-200">
              <CardHeader>
                <CardTitle className="text-base">💡 Design Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>• Skeleton loaders match component structure</p>
                <p>• Realistic loading time simulation (3 groups, 2 items each)</p>
                <p>• Smooth animation indicates loading in progress</p>
                <p>• Consistent spacing with actual content</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Design Guidelines */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>Design Guidelines & Patterns</CardTitle>
            <CardDescription>Key principles for the activity timeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Grouping Rules */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">📊 Intelligent Grouping Rules</h3>
              <div className="bg-gray-50 rounded p-4 space-y-2 text-sm">
                <p>
                  <strong>Default Behavior:</strong> Events are automatically grouped by type
                  (Predictions, Events, Disputes, Transactions, Account, Verification)
                </p>
                <p>
                  <strong>Collapse Trigger:</strong> Groups with 3+ events and no priority event
                  types are collapsed to reduce visual noise
                </p>
                <p>
                  <strong>Priority Events:</strong> Events like {'"'}prediction_settled{'"'}, {'"'}winnings_claimed{'"'} are always
                  expanded for visibility
                </p>
                <p>
                  <strong>Time Range:</strong> Events within 60-minute windows are considered for
                  grouping
                </p>
              </div>
            </div>

            {/* Timestamp Strategy */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">⏰ Timestamp Strategy</h3>
              <div className="bg-gray-50 rounded p-4 space-y-2 text-sm">
                <p>
                  <strong>Relative Display:</strong> {'"'}Just now{'"'}, {'"'}2 hours ago{'"'}, {'"'}Yesterday{'"'}, {'"'}3 days ago{'"'} for
                  quick scanning
                </p>
                <p>
                  <strong>Exact Time:</strong> Hover tooltip shows full timestamp with timezone
                </p>
                <p>
                  <strong>Time Format:</strong> Displays both relative (main) and exact time (HH:MM
                  AM/PM) for context
                </p>
              </div>
            </div>

            {/* Load More Pattern */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">📥 Load More Pattern</h3>
              <div className="bg-gray-50 rounded p-4 space-y-2 text-sm">
                <p>
                  <strong>Pagination:</strong> Load 6 activity groups per page (each group can have
                  multiple events)
                </p>
                <p>
                  <strong>Button Placement:</strong> Centered button after last visible group
                </p>
                <p>
                  <strong>Feedback:</strong> Shows {'"'}Load Older Activities{'"'} with clear indication of more
                  content
                </p>
              </div>
            </div>

            {/* Responsive Design */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">📱 Responsive Behavior</h3>
              <div className="bg-gray-50 rounded p-4 space-y-2 text-sm">
                <p>
                  <strong>Mobile:</strong> Stacked layout, single-column, touch-friendly spacing
                </p>
                <p>
                  <strong>Tablet:</strong> Two-column grid for groups
                </p>
                <p>
                  <strong>Desktop:</strong> Full layout with optimal spacing and hover effects
                </p>
              </div>
            </div>

            {/* Empty/Error/Loading */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">🎨 Fallback States</h3>
              <div className="bg-gray-50 rounded p-4 space-y-2 text-sm">
                <p>
                  <strong>Empty:</strong> Archive icon, clear messaging, call-to-action button
                </p>
                <p>
                  <strong>Error:</strong> Alert icon, error message, technical details, retry button
                </p>
                <p>
                  <strong>Loading:</strong> Skeleton loaders, smooth animation, maintains layout
                  stability
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Component Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Component Usage</CardTitle>
            <CardDescription>How to use the ActivityTimeline component</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-xs sm:text-sm">
              {`import { ActivityTimeline } from "@/components/activity-timeline";
import { generateMockActivities } from "@/lib/activity-timeline";

export default function MyPage() {
  const activities = generateMockActivities(12);
  
  return (
    <ActivityTimeline
      activities={activities}
      isLoading={false}
      error={null}
      pageSize={6}
      onLoadMore={() => {
        // Fetch more activities
      }}
    />
  );
}`}
            </pre>
          </CardContent>
        </Card>

        {/* Props Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>Props Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Prop</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Default</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-700">activities</td>
                    <td className="py-3 px-4 text-gray-700">ActivityEvent[]</td>
                    <td className="py-3 px-4 text-gray-500">Mock data</td>
                    <td className="py-3 px-4 text-gray-600">Array of activity events</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-700">isLoading</td>
                    <td className="py-3 px-4 text-gray-700">boolean</td>
                    <td className="py-3 px-4 text-gray-500">false</td>
                    <td className="py-3 px-4 text-gray-600">Show loading state</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-700">error</td>
                    <td className="py-3 px-4 text-gray-700">string | null</td>
                    <td className="py-3 px-4 text-gray-500">null</td>
                    <td className="py-3 px-4 text-gray-600">Error message to display</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-700">pageSize</td>
                    <td className="py-3 px-4 text-gray-700">number</td>
                    <td className="py-3 px-4 text-gray-500">6</td>
                    <td className="py-3 px-4 text-gray-600">Groups per page for pagination</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-700">onLoadMore</td>
                    <td className="py-3 px-4 text-gray-700">() => void</td>
                    <td className="py-3 px-4 text-gray-500">undefined</td>
                    <td className="py-3 px-4 text-gray-600">Callback when user clicks load more</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
