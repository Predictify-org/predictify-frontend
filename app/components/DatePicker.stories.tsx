import type { Meta, StoryObj } from "@storybook/react";
import { DatePicker } from "./DatePicker";
import { useState } from "react";

const meta: Meta<typeof DatePicker> = {
  title: "Components/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
};

export default meta;

export const DefaultSingle: StoryObj = {
  render: function SingleDemo() {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    return (
      <div className="max-w-xs">
        <DatePicker
          mode="single"
          label="Market Resolution Date"
          value={selectedDate}
          onChange={setSelectedDate}
        />
      </div>
    );
  },
};

export const RangeMode: StoryObj = {
  render: function RangeDemo() {
    const [range, setRange] = useState<{ from: Date | null; to: Date | null }>({
      from: new Date(),
      to: new Date(Date.now() + 7 * 86400000),
    });

    return (
      <div className="max-w-md">
        <DatePicker
          mode="range"
          value={range}
          onChange={setRange}
          fromLabel="Betting Opens"
          toLabel="Betting Closes"
        />
      </div>
    );
  },
};

export const Disabled: StoryObj = {
  render: () => (
    <div className="max-w-xs">
      <DatePicker
        mode="single"
        label="Locked Expiration Date"
        value={new Date("2026-12-31")}
        disabled
      />
    </div>
  ),
};

export const LongLabelsAndHelp: StoryObj = {
  render: function LongLabelDemo() {
    const [date, setDate] = useState<Date | null>(null);
    return (
      <div className="max-w-md">
        <DatePicker
          mode="single"
          label="Target Blockchain Finality Verification and Automated Dispute Window Deadline"
          placeholder="Select finality date"
          value={date}
          onChange={setDate}
        />
      </div>
    );
  },
};
