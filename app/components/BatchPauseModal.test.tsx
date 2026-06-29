/**
 * @jest-environment jsdom
 */

import { render, fireEvent } from "@testing-library/react";
const { screen } = require("@testing-library/react") as any;
import {
  BatchPauseModal,
  groupActiveByRecipient,
  type BatchPauseStream,
} from "./BatchPauseModal";

const STREAMS: BatchPauseStream[] = [
  { id: "a", recipient: "alice", status: "active" },
  { id: "b", recipient: "alice", status: "active" },
  { id: "c", recipient: "bob", status: "active" },
  { id: "d", recipient: "alice", status: "paused" },
];

describe("groupActiveByRecipient", () => {
  it("groups only active streams by recipient", () => {
    const groups = groupActiveByRecipient(STREAMS);
    expect(groups.get("alice")).toEqual(["a", "b"]);
    expect(groups.get("bob")).toEqual(["c"]);
  });
});

describe("BatchPauseModal", () => {
  it("lists recipients with their active counts and confirms the selection", () => {
    const onConfirm = jest.fn();

    render(
      <BatchPauseModal
        streams={STREAMS}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("(2 active)")).toBeInTheDocument();
    expect(screen.getByText("(1 active)")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/bob/));
    fireEvent.click(screen.getByText("Pause 1 stream"));

    expect(onConfirm).toHaveBeenCalledWith("bob", ["c"]);
  });

  it("shows an empty state when nothing is active", () => {
    render(
      <BatchPauseModal
        streams={[{ id: "x", recipient: "z", status: "paused" }]}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("No active streams to pause.")).toBeInTheDocument();
  });
});
