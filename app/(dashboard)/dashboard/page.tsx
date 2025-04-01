import Link from "next/link"
import { Activity, Calendar, CheckCircle, DollarSign, HelpCircle, TrendingUp, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/events/new">Create New Event</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">+2 from last week</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12,543</div>
                <p className="text-xs text-muted-foreground">+573 from yesterday</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$4,325.49</div>
                <p className="text-xs text-muted-foreground">+12.5% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">573</div>
                <p className="text-xs text-muted-foreground">+201 since last week</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Platform Activity</CardTitle>
                <CardDescription>User activity and predictions over time</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[200px] w-full bg-muted/25 rounded-md flex items-center justify-center text-muted-foreground">
                  Activity Chart Placeholder
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Pending Tasks</CardTitle>
                <CardDescription>Tasks requiring admin attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <CheckCircle className="h-5 w-5 text-amber-500" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">8 events need outcome verification</p>
                      <p className="text-sm text-muted-foreground">Deadline: Today</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto">
                      Verify
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <HelpCircle className="h-5 w-5 text-red-500" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">12 disputes need resolution</p>
                      <p className="text-sm text-muted-foreground">3 high priority</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto">
                      Resolve
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Monthly financial report ready</p>
                      <p className="text-sm text-muted-foreground">April 2023</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto">
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New user registrations over time</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/25 rounded-md flex items-center justify-center text-muted-foreground">
                  User Growth Chart Placeholder
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>User Demographics</CardTitle>
                <CardDescription>Breakdown of user base</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/25 rounded-md flex items-center justify-center text-muted-foreground">
                  Demographics Chart Placeholder
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Reports</CardTitle>
              <CardDescription>Download or view generated reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="font-medium">Monthly Financial Summary</h3>
                    <p className="text-sm text-muted-foreground">April 2023</p>
                  </div>
                  <Button variant="outline">Download</Button>
                </div>
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="font-medium">User Activity Report</h3>
                    <p className="text-sm text-muted-foreground">Last 30 days</p>
                  </div>
                  <Button variant="outline">Download</Button>
                </div>
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="font-medium">Event Performance Analysis</h3>
                    <p className="text-sm text-muted-foreground">Q1 2023</p>
                  </div>
                  <Button variant="outline">Download</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

