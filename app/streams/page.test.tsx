import { render, screen } from "@testing-library/react";
import { StreamsPageContent } from "./StreamsPageContent";

describe("StreamsPageContent", () => {
  it("renders the empty state", () => {
    render(<StreamsPageContent state="empty" streams={[]} />);

    expect(screen.getByRole("heading", { name: /your streams list is empty/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create your first stream/i })).toBeInTheDocument();
  });

  it("renders the loading skeleton state", () => {
    render(<StreamsPageContent state="loading" />);

    expect(screen.getByLabelText(/loading streams/i)).toBeInTheDocument();
    expect(screen.getAllByTestId("stream-row-skeleton")).toHaveLength(3);
  });

  it("renders the populated list state", () => {
    render(<StreamsPageContent state="populated" />);

    expect(screen.getByRole("heading", { name: /streams overview/i })).toBeInTheDocument();
    expect(screen.getByText(/ada creative studio/i)).toBeInTheDocument();
    expect(screen.getByText(/120 xlm \/ month/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/stream status: active/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export history/i })).toBeInTheDocument();
  });

  it("renders calendar-month edge case schedule messaging", () => {
    render(
      <StreamsPageContent
        state="populated"
        streams={[
          {
            id: "stream-jan-31",
            nextAction: "Pause",
            rate: "45 XLM / month",
            recipient: "January 31 Studio",
            schedule: "Starts Jan 31; Feb prorated (UTC)",
            status: "active",
          },
          {
            id: "stream-feb",
            nextAction: "Pause",
            rate: "60 XLM / month",
            recipient: "Non-Leap Ops",
            schedule: "Non-leap Feb proration applied",
            status: "active",
          },
          {
            id: "stream-dst",
            nextAction: "Pause",
            rate: "22 XLM / month",
            recipient: "DST Display",
            schedule: "DST shift shown in local time (display only)",
            status: "active",
          },
          {
            id: "stream-pause",
            nextAction: "Withdraw",
            rate: "18 XLM / month",
            recipient: "End-of-Month Pause",
            schedule: "Paused on last day; final day prorated (UTC)",
            status: "ended",
          },
        ]}
      />,
    );

    expect(screen.getByText(/starts jan 31; feb prorated/i)).toBeInTheDocument();
    expect(screen.getByText(/non-leap feb proration applied/i)).toBeInTheDocument();
    expect(screen.getByText(/dst shift shown in local time/i)).toBeInTheDocument();
    expect(screen.getByText(/paused on last day; final day prorated/i)).toBeInTheDocument();
  });
});
