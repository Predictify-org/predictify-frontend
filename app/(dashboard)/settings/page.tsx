"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SettingsPage() {
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    // Simulate API call
    setTimeout(() => {
      setSaveSuccess(true)
      setSaveError(false)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
    }, 1000)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="roles">User Roles</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <form onSubmit={handleSave}>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>Configure general platform settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {saveSuccess && (
                  <Alert className="bg-green-500/15 text-green-500 border-green-500/50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Settings saved successfully!</AlertDescription>
                  </Alert>
                )}
                {saveError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>There was an error saving your settings.</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="platform-name">Platform Name</Label>
                  <Input id="platform-name" defaultValue="Prediction Platform" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform-url">Platform URL</Label>
                  <Input id="platform-url" defaultValue="https://predictions.example.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input id="support-email" type="email" defaultValue="support@example.com" />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="platform-fee">Platform Fee (%)</Label>
                  <Input id="platform-fee" type="number" defaultValue="5" min="0" max="100" />
                  <p className="text-sm text-muted-foreground">Percentage fee taken from each prediction pool</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-prediction">Minimum Prediction Amount</Label>
                  <Input id="min-prediction" type="number" defaultValue="1" min="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-prediction">Maximum Prediction Amount</Label>
                  <Input id="max-prediction" type="number" defaultValue="1000" min="0" />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">Put the platform in maintenance mode</p>
                  </div>
                  <Switch id="maintenance-mode" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="new-registrations">Allow New Registrations</Label>
                    <p className="text-sm text-muted-foreground">Allow new users to register on the platform</p>
                  </div>
                  <Switch id="new-registrations" defaultChecked />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit">Save Changes</Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security settings for the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Require two-factor authentication for all admin users</p>
                  <Switch id="two-factor" defaultChecked />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input id="session-timeout" type="number" defaultValue="30" min="5" />
                <p className="text-sm text-muted-foreground">Automatically log out inactive users after this period</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password-policy">Password Policy</Label>
                <Select defaultValue="strong">
                  <SelectTrigger id="password-policy">
                    <SelectValue placeholder="Select password policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic (8+ characters)</SelectItem>
                    <SelectItem value="medium">Medium (8+ chars, mixed case)</SelectItem>
                    <SelectItem value="strong">Strong (8+ chars, mixed case, numbers, symbols)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="ip-whitelist">IP Whitelist</Label>
                <Textarea id="ip-whitelist" placeholder="Enter IP addresses, one per line" className="min-h-[100px]" />
                <p className="text-sm text-muted-foreground">
                  Only allow admin access from these IP addresses (leave empty to allow all)
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Security Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure when and how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Email Notifications</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-disputes">Dispute Submissions</Label>
                    <p className="text-sm text-muted-foreground">Receive email when a new dispute is submitted</p>
                  </div>
                  <Switch id="email-disputes" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-events">Event Deadlines</Label>
                    <p className="text-sm text-muted-foreground">Receive email when events need verification</p>
                  </div>
                  <Switch id="email-events" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-reports">Financial Reports</Label>
                    <p className="text-sm text-muted-foreground">Receive weekly and monthly financial reports</p>
                  </div>
                  <Switch id="email-reports" defaultChecked />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">System Notifications</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="system-disputes">High Priority Disputes</Label>
                    <p className="text-sm text-muted-foreground">Show system notification for high priority disputes</p>
                  </div>
                  <Switch id="system-disputes" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="system-events">Event Verification Reminders</Label>
                    <p className="text-sm text-muted-foreground">Show reminders for events needing verification</p>
                  </div>
                  <Switch id="system-events" defaultChecked />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Notification Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Roles & Permissions</CardTitle>
              <CardDescription>Manage admin roles and their permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Super Admin</h3>
                    <p className="text-sm text-muted-foreground">Full access to all platform features</p>
                  </div>
                  <Badge>1 User</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Event Manager</h3>
                    <p className="text-sm text-muted-foreground">Can create, edit, and verify prediction events</p>
                  </div>
                  <Badge>3 Users</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Dispute Resolver</h3>
                    <p className="text-sm text-muted-foreground">Can review and resolve user disputes</p>
                  </div>
                  <Badge>2 Users</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Financial Analyst</h3>
                    <p className="text-sm text-muted-foreground">Can view financial data and generate reports</p>
                  </div>
                  <Badge>2 Users</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Read-Only</h3>
                    <p className="text-sm text-muted-foreground">Can view data but cannot make changes</p>
                  </div>
                  <Badge>4 Users</Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">Add New Admin User</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-admin-email">Email</Label>
                    <Input id="new-admin-email" type="email" placeholder="email@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-admin-role">Role</Label>
                    <Select>
                      <SelectTrigger id="new-admin-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super-admin">Super Admin</SelectItem>
                        <SelectItem value="event-manager">Event Manager</SelectItem>
                        <SelectItem value="dispute-resolver">Dispute Resolver</SelectItem>
                        <SelectItem value="financial-analyst">Financial Analyst</SelectItem>
                        <SelectItem value="read-only">Read-Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="mt-2">Add User</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage API keys for external integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Production API Key</h3>
                    <p className="text-sm text-muted-foreground">Used for live integrations</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="password" value="" className="w-64" readOnly />
                    <Button variant="outline" size="sm">
                      Show
                    </Button>
                    <Button variant="outline" size="sm">
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Test API Key</h3>
                    <p className="text-sm text-muted-foreground">Used for testing integrations</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="password" value="" className="w-64" readOnly />
                    <Button variant="outline" size="sm">
                      Show
                    </Button>
                    <Button variant="outline" size="sm">
                      Copy
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-medium">API Access Control</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="api-enabled">Enable API Access</Label>
                    <p className="text-sm text-muted-foreground">Allow external applications to access the API</p>
                  </div>
                  <Switch id="api-enabled" defaultChecked />
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="api-whitelist">Domain Whitelist</Label>
                  <Textarea
                    id="api-whitelist"
                    placeholder="Enter domains, one per line (e.g., example.com)"
                    className="min-h-[100px]"
                  />
                  <p className="text-sm text-muted-foreground">
                    Only allow API requests from these domains (leave empty to allow all)
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline">Regenerate API Keys</Button>
                <Button>Save API Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

