"use client"

import { Badge } from "@/components/ui/badge"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProfileShareCard } from "@/components/profile/ProfileShareCard"
import { useWalletContext } from "@/context/WalletContext"

export default function ProfilePage() {
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { address, name } = useWalletContext()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    setSaveSuccess(false)

    let attempt = 0
    const maxRetries = 3
    let success = false

    while (attempt < maxRetries && !success) {
      try {
        // Simulate API call with timeout and potential failure
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            if (Math.random() < 0.1) {
              reject(new Error("Network timeout"))
            } else {
              resolve(true)
            }
          }, 1000)
        })
        success = true
      } catch (err) {
        attempt++
        if (attempt >= maxRetries) {
          setError("Failed to save profile after multiple attempts. Please try again.")
        } else {
          // exponential backoff
          await new Promise((r) => setTimeout(r, 1000 * attempt))
        }
      }
    }

    if (success) {
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
    }
    setIsSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Your Profile</h1>
        <ProfileShareCard profile={shareProfile} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <form onSubmit={handleSave}>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {saveSuccess && (
                <Alert className="bg-green-500/15 text-green-500 border-green-500/50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Profile updated successfully!</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src="/placeholder.svg?height=80&width=80"
                    srcSet="/placeholder.svg?height=40&width=40 40w, /placeholder.svg?height=80&width=80 80w, /placeholder.svg?height=160&width=160 160w"
                    sizes="80px"
                    alt="Avatar"
                  />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">
                    Change Avatar
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" defaultValue="Admin" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" defaultValue="User" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="admin@example.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-title">Job Title</Label>
                <Input id="job-title" defaultValue="Platform Administrator" />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Update your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input id="current-password" type="password" />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input id="confirm-password" type="password" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Password Requirements:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>At least 8 characters</li>
                <li>At least one uppercase letter</li>
                <li>At least one number</li>
                <li>At least one special character</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button>Update Password</Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Activity</CardTitle>
          <CardDescription>Recent login activity for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-medium">Today, 10:30 AM</p>
                <p className="text-sm text-muted-foreground">192.168.1.1 • Chrome on Windows</p>
              </div>
              <Badge className="bg-green-500">Current Session</Badge>
            </div>
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-medium">Yesterday, 3:45 PM</p>
                <p className="text-sm text-muted-foreground">192.168.1.1 • Chrome on Windows</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-medium">April 12, 2023, 9:15 AM</p>
                <p className="text-sm text-muted-foreground">192.168.1.1 • Chrome on Windows</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

