import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { VerificationStepper, type Step } from "../VerificationStepper"

const defaultSteps: Step[] = [
  { id: "select", label: "Select Event", state: "current" },
  { id: "review", label: "Review Event", state: "incomplete" },
  { id: "winner", label: "Select Winner", state: "incomplete" },
  { id: "notes", label: "Add Notes", state: "incomplete" },
  { id: "confirm", label: "Confirm", state: "incomplete" },
]

describe("VerificationStepper", () => {
  it("renders all steps", () => {
    render(<VerificationStepper steps={defaultSteps} currentStep={0} />)

    expect(screen.getByText("Select Event")).toBeInTheDocument()
    expect(screen.getByText("Review Event")).toBeInTheDocument()
    expect(screen.getByText("Select Winner")).toBeInTheDocument()
    expect(screen.getByText("Add Notes")).toBeInTheDocument()
    expect(screen.getByText("Confirm")).toBeInTheDocument()
  })

  it("has role progressbar with aria attributes", () => {
    render(<VerificationStepper steps={defaultSteps} currentStep={0} />)

    const progressbar = screen.getByRole("progressbar")
    expect(progressbar).toHaveAttribute("aria-valuemin", "1")
    expect(progressbar).toHaveAttribute("aria-valuemax", "5")
    expect(progressbar).toHaveAttribute("aria-valuenow", "1")
    expect(progressbar).toHaveAttribute("aria-label", "Verification progress")
  })

  it("updates aria-valuenow when on different steps", () => {
    const { rerender } = render(<VerificationStepper steps={defaultSteps} currentStep={2} />)

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3")
  })

  it("marks the current step with aria-current=step", () => {
    render(<VerificationStepper steps={defaultSteps} currentStep={0} />)

    const currentButton = screen.getByText("Select Event").closest("button")
    expect(currentButton).toHaveAttribute("aria-current", "step")
  })

  it("disables incomplete step buttons", () => {
    render(<VerificationStepper steps={defaultSteps} currentStep={0} />)

    const incompleteButtons = screen.getAllByRole("button")
    expect(incompleteButtons[1]).toBeDisabled()
    expect(incompleteButtons[2]).toBeDisabled()
  })

  it("renders done steps with a check icon", () => {
    const stepsWithDone: Step[] = [
      { id: "select", label: "Select Event", state: "done" },
      { id: "review", label: "Review Event", state: "current" },
      { id: "winner", label: "Select Winner", state: "incomplete" },
      { id: "notes", label: "Add Notes", state: "incomplete" },
      { id: "confirm", label: "Confirm", state: "incomplete" },
    ]

    render(<VerificationStepper steps={stepsWithDone} currentStep={1} />)

    const checkIcons = document.querySelectorAll("svg.lucide-check")
    expect(checkIcons.length).toBeGreaterThanOrEqual(1)
  })

  it("renders error steps with an X icon", () => {
    const stepsWithError: Step[] = [
      { id: "select", label: "Select Event", state: "done" },
      { id: "review", label: "Review Event", state: "error" },
      { id: "winner", label: "Select Winner", state: "current" },
      { id: "notes", label: "Add Notes", state: "incomplete" },
      { id: "confirm", label: "Confirm", state: "incomplete" },
    ]

    render(<VerificationStepper steps={stepsWithError} currentStep={2} />)

    const xIcons = document.querySelectorAll("svg.lucide-x")
    expect(xIcons.length).toBeGreaterThanOrEqual(1)
  })

  it("calls onStepClick when a completed step is clicked", async () => {
    const handleClick = jest.fn()
    const stepsWithDone: Step[] = [
      { id: "select", label: "Select Event", state: "done" },
      { id: "review", label: "Review Event", state: "current" },
      { id: "winner", label: "Select Winner", state: "incomplete" },
      { id: "notes", label: "Add Notes", state: "incomplete" },
      { id: "confirm", label: "Confirm", state: "incomplete" },
    ]

    render(<VerificationStepper steps={stepsWithDone} currentStep={1} onStepClick={handleClick} />)

    await userEvent.click(screen.getByText("Select Event"))
    expect(handleClick).toHaveBeenCalledWith(0)
  })

  it("does not call onStepClick when an incomplete step is clicked", async () => {
    const handleClick = jest.fn()
    render(<VerificationStepper steps={defaultSteps} currentStep={0} onStepClick={handleClick} />)

    const incompleteButtons = screen.getAllByRole("button")
    await userEvent.click(incompleteButtons[1])
    expect(handleClick).not.toHaveBeenCalled()
  })
})
