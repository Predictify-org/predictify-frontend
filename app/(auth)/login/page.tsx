"use client"

import type React from "react"

import { useId, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

type FieldName = "email" | "password"

type FormErrors = Partial<Record<FieldName, string>> & { form?: string }

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * FWC26 campaign stats shown above the login form.
 *
 * These are static display values that represent live platform activity for
 * the GrantFox FWC26 (Stellar Wave) campaign. Each value uses:
 *   - `tabular-nums`       — Tailwind/CSS utility: font-variant-numeric: tabular-nums
 *   - `data-numeric="true"` — attribute-based opt-in (see src/styles/typography.css)
 *
 * Both mechanisms are redundant on purpose: the class is tree-shaken by Tailwind,
 * the attribute selector works in any plain-CSS context (e.g. email receipts, SSR).
 *
 * Tabular-nums ensures digits occupy equal horizontal space so the layout does
 * not shift as values update in place (WCAG 1.4.4 – Resize Text, stable layout).
 */
const CAMPAIGN_STATS = [
  { label: "Participants", value: "12,543", testId: "stat-participants" },
  { label: "Prize Pool", value: "50,000 XLM", testId: "stat-prize-pool" },
  { label: "Markets Open", value: "128", testId: "stat-markets-open" },
] as const

export default function LoginPage() {
  const router = useRouter()
  const emailId = useId()
  const passwordId = useId()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [isLoading, setIsLoading] = useState(false)

  const validateField = (name: FieldName, value: string) => {
    if (name === "email") {
      if (!value.trim()) {
        return "Email is required."
      }

      if (!emailPattern.test(value.trim())) {
        return "Enter a valid email address."
      }
    }

    if (name === "password" && !value.trim()) {
      return "Password is required."
    }

    return undefined
  }

  const validateForm = (nextEmail: string, nextPassword: string) => {
    const nextErrors: FormErrors = {}

    const emailError = validateField("email", nextEmail)
    const passwordError = validateField("password", nextPassword)

    if (emailError) {
      nextErrors.email = emailError
    }

    if (passwordError) {
      nextErrors.password = passwordError
    }

    return nextErrors
  }

  const updateFieldError = (name: FieldName, value: string) => {
    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: validateField(name, value),
    }))
  }

  const handleFieldChange = (name: FieldName, value: string) => {
    if (name === "email") {
      setEmail(value)
    } else {
      setPassword(value)
    }

    if (touched[name]) {
      updateFieldError(name, value)
    }

    if (errors.form) {
      setErrors((currentErrors) => ({ ...currentErrors, form: undefined }))
    }
  }

  const handleFieldBlur = (name: FieldName, value: string) => {
    setTouched((currentTouched) => ({ ...currentTouched, [name]: true }))
    updateFieldError(name, value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    const nextErrors = validateForm(email, password)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setTouched({ email: true, password: true })
      setIsLoading(false)
      return
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (email.trim() === "admin@example.com" && password === "password") {
        router.push("/dashboard")
      } else {
        setErrors({
          form: "We could not sign you in with those credentials. Please double-check your details and try again.",
        })
      }
    } catch {
      setErrors({
        form: "We could not complete the sign-in request right now. Please try again in a moment.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const emailError = errors.email
  const passwordError = errors.password
  const formError = errors.form

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 gap-6">
      {/*
       * GrantFox FWC26 campaign stats banner
       *
       * Surfacing key platform numbers on the login screen gives prospective
       * participants an at-a-glance sense of campaign scale before they sign in.
       *
       * Accessibility:
       *   - role="region" + aria-label groups the stats for screen-reader navigation.
       *   - Each stat value uses `tabular-nums` (font-variant-numeric: tabular-nums)
       *     so digits align vertically — numbers will not cause layout reflow when
       *     they update in place (e.g. via polling/websocket in a future iteration).
       *   - `data-numeric="true"` provides an attribute-based opt-in that works
       *     in any CSS context (plain stylesheets, email templates, SSR) without
       *     relying on the Tailwind class being present.
       *
       * Responsive:
       *   - Single-row flex wrap. Collapses gracefully to a single column on xs.
       */}
      <section
        aria-label="GrantFox FWC26 campaign statistics"
        className="w-full max-w-md"
      >
        <dl className="flex flex-wrap justify-around gap-4 rounded-xl border bg-card px-4 py-3 shadow-sm">
          {CAMPAIGN_STATS.map(({ label, value, testId }) => (
            <div key={testId} className="flex flex-col items-center gap-0.5 min-w-[5rem]">
              {/*
               * `tabular-nums` — Tailwind utility → font-variant-numeric: tabular-nums
               * `data-numeric="true"` — attribute selector in src/styles/typography.css
               *
               * Both are applied so the rule is robust: Tailwind's JIT purge removes
               * unused classes but the CSS attribute rule always applies.
               */}
              <dd
                data-testid={testId}
                data-numeric="true"
                className="text-stat-sm font-bold tabular-nums leading-tight text-foreground"
              >
                {value}
              </dd>
              <dt className="text-caption text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
          <CardDescription>Enter your credentials to access the admin dashboard</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor={emailId}>Email</Label>
              <Input
                id={emailId}
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                onBlur={(e) => handleFieldBlur("email", e.target.value)}
                className={cn(emailError && "border-destructive focus-visible:ring-destructive")}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? `${emailId}-error` : undefined}
                autoComplete="email"
                required
              />
              {emailError && (
                <p id={`${emailId}-error`} className="text-sm text-destructive" role="alert">
                  {emailError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={passwordId}>Password</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id={passwordId}
                type="password"
                value={password}
                onChange={(e) => handleFieldChange("password", e.target.value)}
                onBlur={(e) => handleFieldBlur("password", e.target.value)}
                className={cn(passwordError && "border-destructive focus-visible:ring-destructive")}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? `${passwordId}-error` : undefined}
                autoComplete="current-password"
                required
              />
              {passwordError && (
                <p id={`${passwordId}-error`} className="text-sm text-destructive" role="alert">
                  {passwordError}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
