'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { mockPredictionStats, mockPredictions } from '@/lib/mock-predictions';
import { Prediction, PredictionFilterTab } from '@/types/predictions';

export default function MyPredictionsPage() {
  const [activeTab, setActiveTab] = useState<PredictionFilterTab>('all');
  const [mainTab, setMainTab] = useState<'predictions' | 'history'>('predictions');
  const stats = mockPredictionStats;

  const filterPredictions = (tab: PredictionFilterTab): Prediction[] => {
    switch (tab) {
      case 'active':
        return mockPredictions.filter((p) => p.status === 'active');
      case 'pending':
        return mockPredictions.filter((p) => p.status === 'pending');
      case 'completed':
        return mockPredictions.filter((p) => p.status === 'won' || p.status === 'lost');
      default:
        return mockPredictions;
    }
  };

  const filteredPredictions = filterPredictions(activeTab);

  return (
    <div className="flex flex-col gap-6">
     
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex gap-6">
          <button
            onClick={() => setMainTab('predictions')}
            className={`text-lg font-semibold pb-2 border-b-2 transition-colors ${
              mainTab === 'predictions'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            My Predictions
          </button>
          <button
            onClick={() => setMainTab('history')}
            className={`text-lg font-semibold pb-2 border-b-2 transition-colors ${
              mainTab === 'history'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Transaction history
          </button>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {mainTab === 'predictions' ? (
        <>
         
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-white border border-gray-200 dark:border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Wagered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-black">{stats.totalWagered.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-white border border-gray-200 dark:border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Won
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">{stats.totalWon.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-white border border-gray-200 dark:border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Lost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">{stats.totalLost.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-white border border-gray-200 dark:border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Net Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-500">{stats.netProfit.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

         
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PredictionFilterTab)} className="w-full">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPredictions.map((prediction) => (
                  <PredictionCard key={prediction.id} prediction={prediction} />
                ))}
              </div>

              {filteredPredictions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No predictions found in this category</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>Transaction history will be implemented here</p>
        </div>
      )}
    </div>
  );
}

interface PredictionCardProps {
  prediction: Prediction;
}

function PredictionCard({ prediction }: PredictionCardProps) {
  const getStatusBadge = (status: Prediction['status']) => {
    const variants = {
      active: { label: 'active', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      pending: { label: 'pending', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      won: { label: 'won', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      lost: { label: 'lost', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    };

    const variant = variants[status];
    return (
      <Badge variant="outline" className={`${variant.className} border capitalize`}>
        {variant.label}
      </Badge>
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Sports: 'text-blue-400',
      Politics: 'text-green-400',
      Crypto: 'text-yellow-400',
      Stocks: 'text-cyan-400',
    };
    return colors[category] || 'text-gray-500';
  };

  return (
    <Card className="bg-white dark:bg-white border border-gray-200 dark:border-gray-200 hover:border-purple-500/50 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1 text-black">{prediction.eventTitle}</h3>
            <p className="text-sm text-gray-600">{prediction.eventId}</p>
          </div>
          {getStatusBadge(prediction.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
       
        <div className="flex items-center justify-between text-sm">
          <span className={`font-medium ${getCategoryColor(prediction.category)}`}>
            {prediction.category}
          </span>
          <span className="text-gray-500">{prediction.date}</span>
        </div>

       
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500 mb-1">Stake</p>
            <p className="text-lg font-semibold text-black">{prediction.stake} XLM</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Odds</p>
            <p className="text-lg font-semibold text-black">{prediction.odds}x</p>
          </div>
        </div>

        <div className="pt-2">
          <p className="text-xs text-gray-500 mb-1">Potential Winnings</p>
          <p className="text-xl font-bold text-cyan-500">{prediction.potentialWinnings} XLM</p>
        </div>

       
        {(prediction.status === 'won' || prediction.status === 'lost') && (
          <div className="pt-3 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Outcome:</span>
              <span className="font-medium text-black">{prediction.outcome}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Resolved:</span>
              <span className="font-medium text-black">{prediction.resolved}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}