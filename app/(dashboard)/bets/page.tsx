'use client';

import React, { useState } from 'react';
import { ActiveBets } from '@/components/active-bets';
import { mockActiveBets } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, ChevronDown, Calendar } from 'lucide-react';
import { toast } from 'sonner';

// Mock data for events table (matching the image layout)
const eventsData = [
  {
    id: '1',
    title: 'Arsenal vs Liverpool',
    eventId: '#TXN12345',
    category: 'Football',
    odds: 7.0,
    startDate: 'Apr 12, 2025',
    endDate: 'Dec 12, 2025',
    timeRemaining: '90:09:32:55',
    status: 'active',
  },
  {
    id: '2',
    title: 'Trump vs Kamala',
    eventId: '#TXN12345',
    category: 'Politics',
    odds: 7.0,
    startDate: 'Apr 12, 2025',
    endDate: 'Dec 12, 2025',
    timeRemaining: '29:06:32:55',
    status: 'active',
  },
  {
    id: '3',
    title: 'Bitcoin Price',
    eventId: '#TXN12345',
    category: 'Crypto',
    odds: 7.0,
    startDate: 'Apr 12, 2025',
    endDate: 'Dec 12, 2025',
    timeRemaining: '00:01:32:55',
    status: 'active',
  },
  {
    id: '4',
    title: 'Tesla Stocks',
    eventId: '#TXN12345',
    category: 'Stocks',
    odds: 7.0,
    startDate: 'Apr 12, 2025',
    endDate: 'Dec 12, 2025',
    timeRemaining: '00:00:32:55',
    status: 'active',
  },
];

// Category colors matching the Active Bets component
const getCategoryBadge = (category: string) => {
  const categoryColors = {
    Football: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Politics: 'bg-green-500/20 text-green-400 border-green-500/30',
    Crypto: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Stocks: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    Entertainment: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    Sports: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };

  const colorClass = categoryColors[category as keyof typeof categoryColors] || 'bg-muted/20 text-muted-foreground border-muted/30';

  return (
    <Badge variant="outline" className={`${colorClass} border`}>
      {category}
    </Badge>
  );
};

// Time remaining progress bar component
const TimeRemainingBar = ({ timeRemaining }: { timeRemaining: string }) => {
  // Parse time remaining to get progress percentage
  const getProgressFromTime = (time: string) => {
    const parts = time.split(':');
    if (parts.length === 4) {
      const [days, hours] = parts.map(Number);
      if (days > 30) return 85;
      if (days > 10) return 60;
      if (days > 1) return 30;
      if (hours > 12) return 15;
      return 5;
    }
    return 50;
  };

  const progress = getProgressFromTime(timeRemaining);
  
  // Color based on time remaining
  let colorClass = 'bg-green-500';
  if (progress < 20) colorClass = 'bg-red-500';
  else if (progress < 40) colorClass = 'bg-yellow-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-muted/20 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground min-w-[80px]">
        {timeRemaining}
      </span>
    </div>
  );
};

export default function BetsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('ongoing');
  const [dateRange, setDateRange] = useState({
    from: '29-03-2025',
    to: '29-12-2025'
  });

  const handleAddBet = () => {
    toast.success('Opening Add Bet Flow', {
      description: 'Redirecting to bet creation page...',
      action: {
        label: 'Cancel',
        onClick: () => console.log('Cancelled navigation'),
      },
    });
  };

  const handleLearnMore = () => {
    toast.info('Opening Documentation', {
      description: 'Learn how to create and manage your bets effectively.',
      action: {
        label: 'Continue',
        onClick: () => console.log('Navigate to docs'),
      },
    });
  };

  // Filter events based on search and category
  const filteredEvents = eventsData.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Active Bets Section */}
      <ActiveBets
        bets={mockActiveBets}
        isLoading={isLoading}
        onAddBet={handleAddBet}
        onLearnMore={handleLearnMore}
      />

      {/* Events Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Events</h2>
          
          {/* Event Tabs */}
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'ongoing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('ongoing')}
              className={activeTab === 'ongoing' ? 'bg-primary text-primary-foreground' : ''}
            >
              Ongoing Events
              <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary">
                12
              </Badge>
            </Button>
            <Button
              variant={activeTab === 'upcoming' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming Events
            </Button>
            <Button
              variant={activeTab === 'past' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('past')}
            >
              Past Events
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search"
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[130px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Football">Football</SelectItem>
                <SelectItem value="Politics">Politics</SelectItem>
                <SelectItem value="Crypto">Crypto</SelectItem>
                <SelectItem value="Stocks">Stocks</SelectItem>
                <SelectItem value="Entertainment">Entertainment</SelectItem>
                <SelectItem value="Sports">Sports</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select defaultValue="date">
              <SelectTrigger className="w-[130px]">
                <ChevronDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="category">Sort by Category</SelectItem>
                <SelectItem value="odds">Sort by Odds</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <Input
                type="text"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-24 h-8 text-xs"
              />
              <span>To</span>
              <Input
                type="text"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-24 h-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Events Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Odds</TableHead>
                <TableHead>Start Date - End Date</TableHead>
                <TableHead>Time Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow key={event.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <div className="font-medium">{event.title}</div>
                      <div className="text-xs text-muted-foreground">{event.eventId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getCategoryBadge(event.category)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {event.odds.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {event.startDate} - {event.endDate}
                  </TableCell>
                  <TableCell>
                    <TimeRemainingBar timeRemaining={event.timeRemaining} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm">
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((page) => (
              <Button
                key={page}
                variant={page === 1 ? 'default' : 'outline'}
                size="sm"
                className={`w-8 h-8 ${page === 1 ? 'bg-primary text-primary-foreground' : ''}`}
              >
                {page}
              </Button>
            ))}
          </div>
          
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
