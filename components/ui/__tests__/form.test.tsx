import React from "react"
import { render, screen } from "@testing-library/react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "../form"
import { Input } from "../input"

// ── Test helpers ─────────────────────────────────────────────────────────────

const testSchema = z.object({
  email: z.string().email("Invalid email address"),
})

type TestFormValues = z.infer<typeof testSchema>

/** Shared input selector — uses label since Input default variant doesn't forward placeholder */
function getEmailInput() {
  return screen.getByLabelText("Email")
}

/**
 * Test form wrapper that renders a full FormField setup.
 * Used to test FormControl's aria-describedby integration.
 */
function TestForm({
  onSubmit,
  defaultValues,
}: {
  onSubmit?: (values: TestFormValues) => void
  defaultValues?: Partial<TestFormValues>
}) {
  const form = useForm<TestFormValues>({
    resolver: zodResolver(testSchema),
    defaultValues: { email: "", ...defaultValues },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit || jest.fn())}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormDescription>We&apos;ll never share your email.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  )
}

/**
 * Schema without description, for testing FormControl without FormDescription.
 */
const schemaNoDescription = z.object({
  email: z.string().email("Invalid email address"),
})

function TestFormNoDescription({
  onSubmit,
}: {
  onSubmit?: (values: { email: string }) => void
}) {
  const form = useForm<{ email: string }>({
    resolver: zodResolver(schemaNoDescription),
    defaultValues: { email: "" },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit || jest.fn())}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  )
}

// ── aria-describedby Tests ────────────────────────────────────────────────────

describe("FormControl — aria-describedby", () => {
  it("includes form description id when there is no error", () => {
    render(<TestForm />)

    const input = getEmailInput()
    const describedBy = input.getAttribute("aria-describedby")

    // Should only contain the description id (no message id)
    expect(describedBy).toBeTruthy()
    const ids = describedBy!.split(" ").filter(Boolean)
    expect(ids).toHaveLength(1)

    // Verify the description element exists
    const descEl = document.getElementById(ids[0])
    expect(descEl).toBeInTheDocument()
    expect(descEl).toHaveTextContent(/never share/i)
  })

  it("includes both description and message ids when there is an error", async () => {
    render(<TestForm />)

    const input = getEmailInput()

    // Trigger validation by submitting with empty value
    const submitBtn = screen.getByRole("button", { name: /submit/i })
    submitBtn.click()

    // Find the error message after validation (FormMessage renders a <p>, not role=alert)
    const errorMsg = await screen.findByText(/invalid email/i)
    expect(errorMsg).toBeInTheDocument()

    const describedBy = input.getAttribute("aria-describedby")
    expect(describedBy).toBeTruthy()
    const ids = describedBy!.split(" ").filter(Boolean)
    expect(ids).toHaveLength(2)

    // First id should be description, second should be error message
    const descEl = document.getElementById(ids[0])
    const msgEl = document.getElementById(ids[1])
    expect(descEl).toHaveTextContent(/never share/i)
    expect(msgEl).toHaveTextContent(/invalid email/i)
  })

  it("does not include empty/extra spaces in aria-describedby", () => {
    render(<TestForm />)

    const input = getEmailInput()
    const describedBy = input.getAttribute("aria-describedby")

    // Should not have leading/trailing whitespace
    expect(describedBy).not.toMatch(/^ /)
    expect(describedBy).not.toMatch(/ $/)
    // Should not have multiple consecutive spaces
    expect(describedBy).not.toMatch(/  /)
  })

  it("sets aria-invalid to true when there is an error", async () => {
    render(<TestForm />)

    const input = getEmailInput()

    // Before validation
    expect(input).not.toHaveAttribute("aria-invalid", "true")

    // Trigger validation
    screen.getByRole("button", { name: /submit/i }).click()
    await screen.findByText(/invalid email/i)
    
    expect(input).toHaveAttribute("aria-invalid", "true")
  })

  it("does not set aria-invalid when there is no error", () => {
    render(<TestForm />)

    const input = getEmailInput()
    // aria-invalid should be unset or false when no error
    expect(input.getAttribute("aria-invalid")).not.toBe("true")
  })

  it("only includes description id when no FormDescription is rendered (no error)", () => {
    render(<TestFormNoDescription />)

    const input = getEmailInput()
    const describedBy = input.getAttribute("aria-describedby")

    // formDescriptionId still generated by useFormField even without FormDescription
    expect(describedBy).toBeTruthy()
    const ids = describedBy!.split(" ").filter(Boolean)
    // Just the formDescriptionId — it points to an element that doesn't render
    expect(ids).toHaveLength(1)
  })

  it("aria-describedby ids are stable across re-renders", () => {
    const { rerender } = render(<TestForm />)

    const input = getEmailInput()
    const firstDescribedBy = input.getAttribute("aria-describedby")

    rerender(<TestForm />)
    const secondDescribedBy = getEmailInput().getAttribute("aria-describedby")

    expect(firstDescribedBy).toBe(secondDescribedBy)
  })
})
