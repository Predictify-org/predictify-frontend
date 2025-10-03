"use client"

import { ConnectWalletModal } from "@/components/connect-wallet-modal"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWalletContext } from "@/context/WalletContext"
import { mockConnectedWallets, mockNotificationPreferences, mockUserStats } from "@/lib/mock-data"
import { Bell, CheckCircle, Crown, DollarSign, Shield, Target, TrendingUp, Trophy, Wallet } from "lucide-react"
import { useRef, useState } from "react"

export default function ProfilePage() {
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [notificationPrefs, setNotificationPrefs] = useState(mockNotificationPreferences)
  const [avatar, setAvatar] = useState("/images/avatar2.png")
  const [password, setPassword] = useState("")
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { address, connected } = useWalletContext()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate API call
    setTimeout(() => {
      setSaveSuccess(true)
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
    }, 1000)
  }

  const handleNotificationChange = (category: string, type: string, value: boolean) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [type]: value
      }
    }))
  }

  const handleWalletDisconnect = (walletId: string) => {
    // In a real app, this would call an API to disconnect the wallet
    console.log(`Disconnecting wallet ${walletId}`)
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB')
        return
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatar(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = event.target.value
    setPassword(newPassword)
    
    // Check password requirements
    const requirements = {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /\d/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
    }
    
    setPasswordRequirements(requirements)
    
    // Calculate password strength (0-100)
    const metRequirements = Object.values(requirements).filter(Boolean).length
    const strength = (metRequirements / 5) * 100
    setPasswordStrength(strength)
  }

  const getPasswordStrengthColor = (strength: number) => {
    if (strength < 20) return "bg-red-500"
    if (strength < 40) return "bg-orange-500"
    if (strength < 60) return "bg-yellow-500"
    if (strength < 80) return "bg-blue-500"
    return "bg-green-500"
  }

  const getPasswordStrengthText = (strength: number) => {
    if (strength < 20) return "Very Weak"
    if (strength < 40) return "Weak"
    if (strength < 60) return "Fair"
    if (strength < 80) return "Good"
    return "Strong"
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank <= 100) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    if (rank <= 500) return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    if (rank <= 1000) return "bg-green-500/20 text-green-400 border-green-500/30"
    return "bg-gray-500/20 text-gray-400 border-gray-500/30"
  }

  const getMembershipBadgeColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'premium': return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case 'gold': return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case 'silver': return "bg-gray-500/20 text-gray-400 border-gray-500/30"
      default: return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">User Profile & Account Settings</h1>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <form onSubmit={handleSave}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Update your personal information and account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {saveSuccess && (
                    <Alert className="bg-green-500/15 text-green-500 border-green-500/50">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>Profile updated successfully!</AlertDescription>
                    </Alert>
                  )}

              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                      <AvatarImage src={avatar} alt="Avatar" />
                      <AvatarFallback>AU</AvatarFallback>
                </Avatar>
                    <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                    aria-label="Upload avatar image"
                    title="Upload avatar image"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Avatar
                  </Button>
                      <p className="text-sm text-muted-foreground">JPG, PNG or GIF. Max size 2MB.</p>
                </div>
              </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name</Label>
                      <Input id="first-name" defaultValue="Azunyan" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name</Label>
                      <Input id="last-name" defaultValue="Wu" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="azunyan.wu@example.com" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" defaultValue="azunyan_wu" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Label htmlFor="membership-tier">Membership Tier:</Label>
                    <Badge className={getMembershipBadgeColor(mockUserStats.membershipTier)}>
                      <Crown className="h-3 w-3 mr-1" />
                      {mockUserStats.membershipTier}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit">Save Changes</Button>
                </CardFooter>
              </form>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
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
              <Input 
                id="new-password" 
                type="password" 
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input id="confirm-password" type="password" placeholder="Confirm new password" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Password Requirements:</p>
              <ul className="text-sm space-y-1">
                <li className={`flex items-center gap-2 ${passwordRequirements.length ? 'text-green-500' : 'text-muted-foreground'}`}>
                  <CheckCircle className={`h-4 w-4 ${passwordRequirements.length ? 'text-green-500' : 'text-muted-foreground'}`} />
                  At least 8 characters
                </li>
                <li className={`flex items-center gap-2 ${passwordRequirements.uppercase ? 'text-green-500' : 'text-muted-foreground'}`}>
                  <CheckCircle className={`h-4 w-4 ${passwordRequirements.uppercase ? 'text-green-500' : 'text-muted-foreground'}`} />
                  At least one uppercase letter
                </li>
                <li className={`flex items-center gap-2 ${passwordRequirements.lowercase ? 'text-green-500' : 'text-muted-foreground'}`}>
                  <CheckCircle className={`h-4 w-4 ${passwordRequirements.lowercase ? 'text-green-500' : 'text-muted-foreground'}`} />
                  At least one lowercase letter
                </li>
                <li className={`flex items-center gap-2 ${passwordRequirements.number ? 'text-green-500' : 'text-muted-foreground'}`}>
                  <CheckCircle className={`h-4 w-4 ${passwordRequirements.number ? 'text-green-500' : 'text-muted-foreground'}`} />
                  At least one number
                </li>
                <li className={`flex items-center gap-2 ${passwordRequirements.special ? 'text-green-500' : 'text-muted-foreground'}`}>
                  <CheckCircle className={`h-4 w-4 ${passwordRequirements.special ? 'text-green-500' : 'text-muted-foreground'}`} />
                  At least one special character
                </li>
              </ul>
            </div>
              </CardContent>
              <CardFooter>
                <Button>Update Password</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bets</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockUserStats.totalBets}</div>
                <p className="text-xs text-muted-foreground">All time predictions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockUserStats.winRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {mockUserStats.totalWins} wins, {mockUserStats.totalLosses} losses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Rank</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">#{mockUserStats.rank}</div>
                <Badge className={getRankBadgeColor(mockUserStats.rank)}>
                  {mockUserStats.rank <= 100 ? 'Top 100' : mockUserStats.rank <= 500 ? 'Top 500' : 'Competitive'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${mockUserStats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {mockUserStats.netProfit >= 0 ? '+' : ''}{mockUserStats.netProfit.toFixed(2)} XLM
                </div>
                <p className="text-xs text-muted-foreground">
                  Total: {mockUserStats.totalWinnings.toFixed(2)} XLM
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance History</CardTitle>
              <CardDescription>Your betting performance over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockUserStats.performanceHistory.map((month, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 text-sm font-medium">{month.month}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          {month.wins}W
                        </Badge>
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          {month.losses}L
                        </Badge>
                      </div>
                    </div>
                    <div className={`font-medium ${month.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {month.profit >= 0 ? '+' : ''}{month.profit.toFixed(2)} XLM
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Connected Wallets
              </CardTitle>
              <CardDescription>Manage your connected wallets and security options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockConnectedWallets.map((wallet) => (
                <div key={wallet.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{wallet.name}</div>
                      <div className="text-sm text-muted-foreground break-all">{wallet.address}</div>
                      <div className="text-sm text-muted-foreground">Balance: {wallet.balance}</div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 self-start sm:self-auto">
                      Connected
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleWalletDisconnect(wallet.id)}
                      className="w-full sm:w-auto"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ))}
              
              <Separator />
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="font-medium">Connect New Wallet</div>
                  <div className="text-sm text-muted-foreground">Add another wallet to your account</div>
                </div>
                <Button onClick={() => setIsWalletModalOpen(true)} className="w-full sm:w-auto">
                  Connect Wallet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-4">Email Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Bet Results</div>
                      <div className="text-sm text-muted-foreground">Get notified when your bets are resolved</div>
                    </div>
                    <Switch 
                      checked={notificationPrefs.emailNotifications.betResults}
                      onCheckedChange={(value) => handleNotificationChange('emailNotifications', 'betResults', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">New Events</div>
                      <div className="text-sm text-muted-foreground">Get notified about new prediction events</div>
                    </div>
                    <Switch 
                      checked={notificationPrefs.emailNotifications.newEvents}
                      onCheckedChange={(value) => handleNotificationChange('emailNotifications', 'newEvents', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Promotions</div>
                      <div className="text-sm text-muted-foreground">Get notified about special offers and promotions</div>
                    </div>
                    <Switch 
                      checked={notificationPrefs.emailNotifications.promotions}
                      onCheckedChange={(value) => handleNotificationChange('emailNotifications', 'promotions', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Security Alerts</div>
                      <div className="text-sm text-muted-foreground">Get notified about security-related activities</div>
                    </div>
                    <Switch 
                      checked={notificationPrefs.emailNotifications.security}
                      onCheckedChange={(value) => handleNotificationChange('emailNotifications', 'security', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Weekly Report</div>
                      <div className="text-sm text-muted-foreground">Get a weekly summary of your activity</div>
                    </div>
                    <Switch 
                      checked={notificationPrefs.emailNotifications.weeklyReport}
                      onCheckedChange={(value) => handleNotificationChange('emailNotifications', 'weeklyReport', value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Push Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Bet Results</div>
                      <div className="text-sm text-muted-foreground">Get push notifications for bet results</div>
                    </div>
                    <Switch 
                      checked={notificationPrefs.pushNotifications.betResults}
                      onCheckedChange={(value) => handleNotificationChange('pushNotifications', 'betResults', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">New Events</div>
                      <div className="text-sm text-muted-foreground">Get push notifications for new events</div>
                    </div>
                    <Switch 
                      checked={notificationPrefs.pushNotifications.newEvents}
                      onCheckedChange={(value) => handleNotificationChange('pushNotifications', 'newEvents', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Security Alerts</div>
                      <div className="text-sm text-muted-foreground">Get push notifications for security alerts</div>
                    </div>
                    <Switch 
                      checked={notificationPrefs.pushNotifications.security}
                      onCheckedChange={(value) => handleNotificationChange('pushNotifications', 'security', value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onOpenChange={setIsWalletModalOpen}
        onWalletConnect={(name, address) => {
          console.log(`Connected wallet: ${name} - ${address}`)
          setIsWalletModalOpen(false)
        }}
        onWalletDisconnect={() => {
          console.log('Wallet disconnected')
        }}
      />
    </div>
  )
}