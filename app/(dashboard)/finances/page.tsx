"use client"

import { useState } from "react"
import { ArrowDownRight, ArrowUpRight, Calendar, CreditCard, DollarSign, Download, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"

// Mock data for financial overview
const financialData = {
  totalFees: 42567.89,
  monthlyFees: 8432.15,
  weeklyFees: 2145.67,
  dailyFees: 345.21,
  feeGrowth: 12.5,
  transactions: [
    {
      id: "1",
      date: "2023-04-15",
      eventTitle: "Super Bowl Winner 2023",
      amount: 1245.67,
      type: "platform_fee",
      status: "completed",
    },
    {
      id: "2",
      date: "2023-04-14",
      eventTitle: "Oscar Best Picture 2023",
      amount: 876.32,
      type: "platform_fee",
      status: "completed",
    },
    {
      id: "3",
      date: "2023-04-13",
      eventTitle: "Bitcoin Price on Jan 1, 2023",
      amount: 1543.21,
      type: "platform_fee",
      status: "completed",
    },
    {
      id: "4",
      date: "2023-04-12",
      eventTitle: "UK Prime Minister by End of 2022",
      amount: 654.87,
      type: "platform_fee",
      status: "completed",
    },
    {
      id: "5",
      date: "2023-04-11",
      eventTitle: "French Open Men's Singles Winner 2023",
      amount: 987.65,
      type: "platform_fee",
      status: "completed",
    },
  ],
  feeDistribution: [
    { category: "Sports", percentage: 35, amount: 14898.76 },
    { category: "Finance", percentage: 25, amount: 10641.97 },
    { category: "Politics", percentage: 20, amount: 8513.58 },
    { category: "Entertainment", percentage: 15, amount: 6385.18 },
    { category: "Technology", percentage: 5, amount: 2128.4 },
  ],
}

export default function FinancesPage() {
  const [date, setDate] = useState({
    from: new Date(2023, 3, 1),
    to: new Date(2023, 3, 30),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Financial Overview</h1>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  "Select date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Platform Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${financialData.totalFees.toLocaleString()}</div>
            <div className="flex items-center pt-1 text-xs text-muted-foreground">
              <TrendingUp className="mr-1 h-3.5 w-3.5 text-green-500" />
              <span className="text-green-500">{financialData.feeGrowth}%</span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${financialData.monthlyFees.toLocaleString()}</div>
            <div className="flex items-center pt-1 text-xs text-muted-foreground">
              <ArrowUpRight className="mr-1 h-3.5 w-3.5 text-green-500" />
              <span>April 2023</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${financialData.weeklyFees.toLocaleString()}</div>
            <div className="flex items-center pt-1 text-xs text-muted-foreground">
              <ArrowDownRight className="mr-1 h-3.5 w-3.5 text-red-500" />
              <span className="text-red-500">3.2%</span>
              <span className="ml-1">from last week</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${financialData.dailyFees.toLocaleString()}</div>
            <div className="flex items-center pt-1 text-xs text-muted-foreground">
              <TrendingUp className="mr-1 h-3.5 w-3.5 text-green-500" />
              <span className="text-green-500">8.4%</span>
              <span className="ml-1">from yesterday</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="distribution">Fee Distribution</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Revenue Over Time</CardTitle>
                <CardDescription>Platform fee earnings over the selected period</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/25 rounded-md flex items-center justify-center text-muted-foreground">
                  Revenue Chart Placeholder
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Fee Distribution</CardTitle>
                <CardDescription>Breakdown by category</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full bg-muted/25 rounded-md flex items-center justify-center text-muted-foreground">
                  Distribution Chart Placeholder
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Platform fee transactions for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialData.transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{transaction.eventTitle}</TableCell>
                      <TableCell>{transaction.type === "platform_fee" ? "Platform Fee" : transaction.type}</TableCell>
                      <TableCell className="text-right">${transaction.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee Distribution by Category</CardTitle>
              <CardDescription>Breakdown of platform fees by prediction category</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialData.feeDistribution.map((item) => (
                    <TableRow key={item.category}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell>{item.percentage}%</TableCell>
                      <TableCell className="text-right">${item.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

