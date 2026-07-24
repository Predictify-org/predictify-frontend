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
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
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

