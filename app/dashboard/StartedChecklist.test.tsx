import React from "react"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  StartedChecklist,
  DEFAULT_TASKS,
} from "./StartedChecklist"

// Mock framer-motion to avoid animation loop issues in JSDOM.
// All motion components render as plain HTML elements with children.
jest.mock("framer-motion", () => {
  const React = require("react")
  const createMotionProxy = (): any =>
    new Proxy(
      {},
      {
        get: (_, key: string) => {
          const Component = ({ children, ...props }: any) =>
            React.createElement(key, props, children)
          Component.displayName = `motion.${key}`
          return Component
        },
      },
    )
  return {
    __esModule: true,
    motion: createMotionProxy(),
    AnimatePresence: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    useAnimation: () => ({}),
    useMotionValue: (v: any) => ({
      get: () => v,
      set: () => {},
    }),
    useTransform: (v: any) => v,
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset sessionStorage before each test so state doesn't leak. */
function resetSessionStorage() {
  sessionStorage.clear()
}

/** Small wrapper to set up userEvent. */
function setup(jsx: React.ReactElement) {
  return {
    user: userEvent.setup(),
    ...render(jsx),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StartedChecklist", () => {
  beforeEach(() => {
    resetSessionStorage()
  })

  // ---- Rendering ----------------------------------------------------------

  it("renders all default tasks", () => {
    setup(<StartedChecklist />)
    DEFAULT_TASKS.forEach((task) => {
      expect(screen.getByText(task.label)).toBeInTheDocument()
    })
  })

  it("shows the correct progress text initially", () => {
    setup(<StartedChecklist />)
    const progressText = screen.getByText("0 of 5 tasks completed")
    expect(progressText).toBeInTheDocument()
    expect(progressText).toHaveClass("tabular-nums")
  })

  it("renders the progress bar", () => {
    setup(<StartedChecklist />)
    expect(
      screen.getByRole("progressbar", { name: /checklist progress/i }),
    ).toBeInTheDocument()
  })

  it("renders a dismiss button", () => {
    setup(<StartedChecklist />)
    expect(
      screen.getByRole("button", { name: /dismiss checklist/i }),
    ).toBeInTheDocument()
  })

  // ---- Toggling tasks -----------------------------------------------------

  it("marks a task as completed when its checkbox is checked", async () => {
    const { user } = setup(<StartedChecklist />)
    const checkbox = screen.getByRole("checkbox", {
      name: /mark "connect your wallet" as complete/i,
    })
    await user.click(checkbox)
    expect(screen.getByText("1 of 5 tasks completed")).toBeInTheDocument()
  })

  it("unmarks a task when its checkbox is unchecked", async () => {
    const { user } = setup(<StartedChecklist />)
    const checkbox = screen.getByRole("checkbox", {
      name: /mark "connect your wallet" as complete/i,
    })
    // Complete
    await user.click(checkbox)
    expect(screen.getByText("1 of 5 tasks completed")).toBeInTheDocument()

    // Re-query with the updated aria-label ("incomplete" since it's now checked)
    const checkedCheckbox = screen.getByRole("checkbox", {
      name: /mark "connect your wallet" as incomplete/i,
    })
    // Uncomplete
    await user.click(checkedCheckbox)
    expect(screen.getByText("0 of 5 tasks completed")).toBeInTheDocument()
  })

  it("calls onTaskToggle with the updated completed IDs", async () => {
    const onTaskToggle = jest.fn()
    const { user } = setup(<StartedChecklist onTaskToggle={onTaskToggle} />)
    const checkbox = screen.getByRole("checkbox", {
      name: /mark "connect your wallet" as complete/i,
    })
    await user.click(checkbox)
    expect(onTaskToggle).toHaveBeenCalledWith(["connect-wallet"])
  })

  // ---- Dismiss ------------------------------------------------------------

  it("hides the checklist when dismissed", async () => {
    const { user } = setup(<StartedChecklist />)
    const dismissBtn = screen.getByRole("button", {
      name: /dismiss checklist/i,
    })
    await user.click(dismissBtn)
    expect(
      screen.queryByText("Get started"),
    ).not.toBeInTheDocument()
  })

  it("calls onDismiss when dismissed", async () => {
    const onDismiss = jest.fn()
    const { user } = setup(<StartedChecklist onDismiss={onDismiss} />)
    const dismissBtn = screen.getByRole("button", {
      name: /dismiss checklist/i,
    })
    await user.click(dismissBtn)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  // ---- All complete state -------------------------------------------------

  it("shows celebration state when all tasks are completed", async () => {
    const { user } = setup(<StartedChecklist />)
    // Complete all tasks
    for (const task of DEFAULT_TASKS) {
      const checkbox = screen.getByRole("checkbox", {
        name: new RegExp(`mark "${task.label.toLowerCase()}"`, "i"),
      })
      await user.click(checkbox)
    }
    expect(screen.getByText("You're all set!")).toBeInTheDocument()
    expect(
      screen.getByText(
        "You've completed all the onboarding steps. Happy predicting!",
      ),
    ).toBeInTheDocument()
    // Two dismiss buttons: X icon and the "Dismiss checklist" button
    const dismissButtons = screen.getAllByRole("button", {
      name: /dismiss checklist/i,
    })
    expect(dismissButtons.length).toBe(2)
  })

  it("sets progress bar to full when all tasks are done", async () => {
    const { user } = setup(<StartedChecklist />)
    for (const task of DEFAULT_TASKS) {
      const checkbox = screen.getByRole("checkbox", {
        name: new RegExp(`mark "${task.label.toLowerCase()}"`, "i"),
      })
      await user.click(checkbox)
    }
    const progressBar = screen.getByRole("progressbar", {
      name: /checklist progress/i,
    })
    expect(progressBar).toBeInTheDocument()
    // The progress bar updates its label when all complete
    expect(progressBar).toHaveAttribute(
      "aria-label",
      "Checklist progress: 5 of 5 tasks completed",
    )
  })

  // ---- Accessibility -----------------------------------------------------

  it("each task checkbox has an accessible label", () => {
    setup(<StartedChecklist />)
    DEFAULT_TASKS.forEach((task) => {
      expect(
        screen.getByRole("checkbox", {
          name: new RegExp(`mark "${task.label.toLowerCase()}"`, "i"),
        }),
      ).toBeInTheDocument()
    })
  })

  it("the task list has an accessible role", () => {
    setup(<StartedChecklist />)
    expect(
      screen.getByRole("list", { name: /onboarding checklist/i }),
    ).toBeInTheDocument()
  })

  // ---- Custom tasks -------------------------------------------------------

  it("accepts a custom task list", () => {
    const customTasks = [
      {
        id: "test-1",
        label: "Test task 1",
        description: "A custom task",
        icon: () => <span data-testid="icon" />,
      },
    ]
    setup(<StartedChecklist tasks={customTasks} />)
    expect(screen.getByText("Test task 1")).toBeInTheDocument()
    expect(screen.getByText("0 of 1 tasks completed")).toBeInTheDocument()
  })

  // ---- SessionStorage persistence -----------------------------------------

  it("persists completed tasks to sessionStorage", async () => {
    const { user } = setup(<StartedChecklist />)
    const checkbox = screen.getByRole("checkbox", {
      name: /mark "connect your wallet" as complete/i,
    })
    await user.click(checkbox)

    const stored = sessionStorage.getItem(
      "predictify:started-checklist:completed",
    )
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!)).toEqual(["connect-wallet"])
  })

  it("restores completed tasks from sessionStorage", () => {
    sessionStorage.setItem(
      "predictify:started-checklist:completed",
      JSON.stringify(["connect-wallet", "browse-markets"]),
    )
    setup(<StartedChecklist />)
    expect(screen.getByText("2 of 5 tasks completed")).toBeInTheDocument()
  })

  it("persists dismissed state to sessionStorage", async () => {
    const { user } = setup(<StartedChecklist />)
    const dismissBtn = screen.getByRole("button", {
      name: /dismiss checklist/i,
    })
    await user.click(dismissBtn)

    const stored = sessionStorage.getItem(
      "predictify:started-checklist:dismissed",
    )
    expect(stored).toBe("true")
  })

  it("stays hidden when dismissed state is in sessionStorage", () => {
    sessionStorage.setItem(
      "predictify:started-checklist:dismissed",
      "true",
    )
    setup(<StartedChecklist />)
    expect(
      screen.queryByText("Get started"),
    ).not.toBeInTheDocument()
  })
})
