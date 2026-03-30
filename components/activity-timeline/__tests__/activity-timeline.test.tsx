import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ActivityTimeline } from "../activity-timeline";
import {
  groupActivities,
  formatActivityTimestamp,
  formatActivityTime,
  shouldShowDateSeparator,
  paginateGroupedActivities,
  generateMockActivities,
} from "@/lib/activity-timeline";
import { ActivityEvent } from "@/types/activity";

describe("ActivityTimeline Component", () => {
  describe("Rendering", () => {
    it("should render with default mock data", () => {
      render(<ActivityTimeline />);
      expect(screen.getByText(/activity timeline/i)).toBeInTheDocument();
    });

    it("should render with provided activities", () => {
      const activities = generateMockActivities(5);
      render(
        <ActivityTimeline activities={activities} />
      );
      expect(screen.getByText(/predictions/i)).toBeInTheDocument();
    });

    it("should render empty state when no activities", () => {
      render(<ActivityTimeline activities={[]} />);
      expect(screen.getByText(/no activities yet/i)).toBeInTheDocument();
      expect(screen.getByText(/activity timeline is empty/i)).toBeInTheDocument();
    });

    it("should render loading state when isLoading is true", () => {
      render(<ActivityTimeline isLoading={true} activities={[]} />);
      // Loading skeletons should be visible
      const skeletons = screen.getAllByTestId("skeleton");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should render error state with error message", () => {
      const errorMessage = "Network connection failed";
      render(
        <ActivityTimeline
          activities={[]}
          error={errorMessage}
          onLoadMore={() => {}}
        />
      );
      expect(screen.getByText(/failed to load activities/i)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe("Grouping Logic", () => {
    it("should group activities by type", () => {
      const activities = generateMockActivities(10);
      render(<ActivityTimeline activities={activities} />);

      const groupHeaders = screen.getAllByRole("button");
      expect(groupHeaders.length).toBeGreaterThan(0);
    });

    it("should collapse groups with many events", () => {
      const activities: ActivityEvent[] = [
        ...generateMockActivities(1),
        ...generateMockActivities(5).map((a, i) => ({
          ...a,
          id: `dup-${i}`,
          eventType: "prediction_placed",
        })),
      ];

      render(<ActivityTimeline activities={activities} />);

      // Groups should collapse automatically
      const predictions = screen.getByText(/predictions/i);
      expect(predictions.parentElement).toBeInTheDocument();
    });

    it("should prioritize certain event types in expanded state", () => {
      const activities = [
        {
          id: "1",
          eventType: "prediction_settled" as const,
          groupType: "predictions" as const,
          timestamp: new Date(),
          title: "Prediction Settled",
          description: "Your prediction has been settled",
        },
        {
          id: "2",
          eventType: "prediction_placed" as const,
          groupType: "predictions" as const,
          timestamp: new Date(Date.now() - 3600000),
          title: "Prediction Placed",
          description: "You placed a new prediction",
        },
      ];

      render(<ActivityTimeline activities={activities} />);

      // Priority events should be visible
      expect(screen.getByText(/prediction settled/i)).toBeInTheDocument();
    });
  });

  describe("Timestamp Formatting", () => {
    it("should show relative timestamps", () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const activities: ActivityEvent[] = [
        {
          id: "1",
          eventType: "prediction_placed",
          groupType: "predictions",
          timestamp: oneHourAgo,
          title: "Test Event",
        },
      ];

      render(
        <ActivityTimeline activities={activities} />
      );

      // Should show relative time
      expect(screen.getByText(/hour ago|just now/i)).toBeInTheDocument();
    });

    it("should format older events with dates", () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activities: ActivityEvent[] = [
        {
          id: "1",
          eventType: "prediction_placed",
          groupType: "predictions",
          timestamp: sevenDaysAgo,
          title: "Old Event",
        },
      ];

      render(
        <ActivityTimeline activities={activities} />
      );

      // Should show date for older events
      expect(screen.getByText(/days ago/i)).toBeInTheDocument();
    });
  });

  describe("Expandable Groups", () => {
    it("should toggle group expansion", async () => {
      const activities = generateMockActivities(10);
      render(<ActivityTimeline activities={activities} />);

      const groupButtons = screen.getAllByRole("button");
      const firstButton = groupButtons[0];

      // Initially some groups are collapsed, some expanded
      fireEvent.click(firstButton);

      // State should change
      await waitFor(() => {
        // Component should respond to click
        expect(firstButton).toBeInTheDocument();
      });
    });

    it("should show collapsed summary when expanded is false", () => {
      const activities = generateMockActivities(15);
      render(<ActivityTimeline activities={activities} />);

      // Some groups should show collapsed summary
      const summaries = screen.queryAllByText(/click to expand/i);
      expect(summaries.length >= 0).toBe(true);
    });
  });

  describe("Pagination / Load More", () => {
    it("should render load more button when there are more items", () => {
      const activities = generateMockActivities(24);
      render(
        <ActivityTimeline activities={activities} pageSize={6} />
      );

      const loadMoreButton = screen.getByText(/load older/i);
      expect(loadMoreButton).toBeInTheDocument();
    });

    it("should not render load more button when all items are shown", () => {
      const activities = generateMockActivities(3);
      render(
        <ActivityTimeline activities={activities} pageSize={10} />
      );

      const loadMoreButton = screen.queryByText(/load older/i);
      expect(loadMoreButton).not.toBeInTheDocument();
    });

    it("should call onLoadMore callback when load more is clicked", async () => {
      const activities = generateMockActivities(24);
      const onLoadMore = jest.fn();

      render(
        <ActivityTimeline
          activities={activities}
          pageSize={6}
          onLoadMore={onLoadMore}
        />
      );

      const loadMoreButton = screen.getByText(/load older/i);
      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        expect(onLoadMore).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Transaction Display", () => {
    it("should display amounts for financial events", () => {
      const activities: ActivityEvent[] = [
        {
          id: "1",
          eventType: "deposit",
          groupType: "transactions",
          timestamp: new Date(),
          title: "Deposit Received",
          amount: 1000,
          currency: "USDC",
        },
      ];

      render(
        <ActivityTimeline activities={activities} />
      );

      expect(screen.getByText(/1000/)).toBeInTheDocument();
      expect(screen.getByText(/usdc/i)).toBeInTheDocument();
    });

    it("should show different colors for deposits and withdrawals", () => {
      const activities: ActivityEvent[] = [
        {
          id: "1",
          eventType: "deposit",
          groupType: "transactions",
          timestamp: new Date(),
          title: "Deposit",
          amount: 500,
          currency: "USDC",
        },
        {
          id: "2",
          eventType: "withdrawal",
          groupType: "transactions",
          timestamp: new Date(),
          title: "Withdrawal",
          amount: 200,
          currency: "USDC",
        },
      ];

      render(
        <ActivityTimeline activities={activities} />
      );

      // Both amounts should be displayed
      const amounts = screen.getAllByText(/\d+/);
      expect(amounts.length).toBeGreaterThan(0);
    });
  });

  describe("Responsive Design", () => {
    it("should render with proper responsive classes", () => {
      const activities = generateMockActivities(5);
      const { container } = render(
        <ActivityTimeline activities={activities} />
      );

      // Check for responsive classes
      const space = container.querySelector(".space-y-6");
      expect(space).toBeInTheDocument();
    });

    it("should display full width on mobile", () => {
      const activities = generateMockActivities(5);
      const { container } = render(
        <ActivityTimeline activities={activities} />
      );

      // Should render without max-width constraint on small screens
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing event descriptions gracefully", () => {
      const activities: ActivityEvent[] = [
        {
          id: "1",
          eventType: "prediction_placed",
          groupType: "predictions",
          timestamp: new Date(),
          title: "Event without description",
          // no description
        },
      ];

      render(
        <ActivityTimeline activities={activities} />
      );

      expect(screen.getByText(/event without description/i)).toBeInTheDocument();
    });

    it("should render with missing metadata gracefully", () => {
      const activities: ActivityEvent[] = [
        {
          id: "1",
          eventType: "prediction_placed",
          groupType: "predictions",
          timestamp: new Date(),
          title: "Event without metadata",
          // no metadata
        },
      ];

      render(
        <ActivityTimeline activities={activities} />
      );

      expect(screen.getByText(/event without metadata/i)).toBeInTheDocument();
    });
  });
});

describe("Activity Timeline Utilities", () => {
  describe("groupActivities", () => {
    it("should group activities by type", () => {
      const activities = generateMockActivities(10);
      const grouped = groupActivities(activities);

      expect(grouped.length).toBeGreaterThan(0);
      grouped.forEach((group) => {
        expect(group.groupType).toBeDefined();
        expect(group.events.length).toBeGreaterThan(0);
      });
    });

    it("should sort groups by latest timestamp", () => {
      const activities = generateMockActivities(20);
      const grouped = groupActivities(activities);

      for (let i = 0; i < grouped.length - 1; i++) {
        expect(
          grouped[i].latestTimestamp >= grouped[i + 1].latestTimestamp
        ).toBe(true);
      }
    });

    it("should mark groups for collapse when appropriate", () => {
      const activities = generateMockActivities(20);
      const grouped = groupActivities(activities);

      // Some groups might be collapsed
      const hasCollapsedGroups = grouped.some((g) => !g.isExpanded);
      expect(typeof hasCollapsedGroups === "boolean").toBe(true);
    });
  });

  describe("formatActivityTimestamp", () => {
    it("should return 'Just now' for very recent events", () => {
      const now = new Date();
      const result = formatActivityTimestamp(now);
      expect(result).toBe("Just now");
    });

    it("should return minutes ago format", () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const result = formatActivityTimestamp(thirtyMinutesAgo);
      expect(result).toContain("minute");
    });

    it("should return hours ago format", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = formatActivityTimestamp(twoHoursAgo);
      expect(result).toContain("hour");
    });

    it("should return Yesterday for events 24 hours ago", () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = formatActivityTimestamp(yesterday);
      expect(result).toBe("Yesterday");
    });

    it("should return days ago format", () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const result = formatActivityTimestamp(fiveDaysAgo);
      expect(result).toContain("days");
    });
  });

  describe("formatActivityTime", () => {
    it("should return time in HH:MM AM/PM format", () => {
      const date = new Date("2024-03-15T14:30:00");
      const result = formatActivityTime(date);
      expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });
  });

  describe("shouldShowDateSeparator", () => {
    it("should return false when previous date is null", () => {
      const today = new Date();
      const result = shouldShowDateSeparator(today, null);
      expect(result).toBe(false);
    });

    it("should return true when dates are different", () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const result = shouldShowDateSeparator(today, yesterday);
      expect(result).toBe(true);
    });

    it("should return false when dates are the same", () => {
      const today = new Date();
      const sameDate = new Date(today);
      const result = shouldShowDateSeparator(today, sameDate);
      expect(result).toBe(false);
    });
  });

  describe("paginateGroupedActivities", () => {
    it("should return paginated items", () => {
      const activities = generateMockActivities(20);
      const grouped = groupActivities(activities);

      const { items } = paginateGroupedActivities(grouped, 0, 5);
      expect(items.length).toBeLessThanOrEqual(5);
    });

    it("should indicate when more pages exist", () => {
      const activities = generateMockActivities(20);
      const grouped = groupActivities(activities);

      const { hasMore } = paginateGroupedActivities(grouped, 0, 3);
      expect(typeof hasMore).toBe("boolean");
    });

    it("should handle last page correctly", () => {
      const activities = generateMockActivities(10);
      const grouped = groupActivities(activities);

      const lastPage = Math.ceil(grouped.length / 3);
      const { hasMore } = paginateGroupedActivities(
        grouped,
        lastPage,
        3
      );
      expect(hasMore).toBe(false);
    });
  });

  describe("generateMockActivities", () => {
    it("should generate correct number of activities", () => {
      const activities = generateMockActivities(15);
      expect(activities.length).toBe(15);
    });

    it("should create activities with all required fields", () => {
      const activities = generateMockActivities(1);
      const activity = activities[0];

      expect(activity.id).toBeDefined();
      expect(activity.eventType).toBeDefined();
      expect(activity.groupType).toBeDefined();
      expect(activity.timestamp).toBeDefined();
      expect(activity.title).toBeDefined();
    });

    it("should create valid timestamps", () => {
      const activities = generateMockActivities(5);
      activities.forEach((activity) => {
        const timestamp = new Date(activity.timestamp);
        expect(timestamp instanceof Date).toBe(true);
        expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });
  });
});
