import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Wallet, 
  TrendingUp, 
  Award,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

const QUICK_START_STEPS = [
  {
    step: 1,
    title: "Connect Your Wallet",
    description: "Link your Stellar wallet to get started with predictions",
    icon: <Wallet className="w-6 h-6 text-blue-500" />,
    action: "Connect Wallet",
    completed: false
  },
  {
    step: 2,
    title: "Browse Markets",
    description: "Explore available prediction markets and their odds",
    icon: <TrendingUp className="w-6 h-6 text-green-500" />,
    action: "View Markets",
    completed: false
  },
  {
    step: 3,
    title: "Place Your First Bet",
    description: "Make your prediction and stake your tokens",
    icon: <Play className="w-6 h-6 text-purple-500" />,
    action: "Start Predicting",
    completed: false
  },
  {
    step: 4,
    title: "Earn Rewards",
    description: "Win rewards when your predictions are correct",
    icon: <Award className="w-6 h-6 text-yellow-500" />,
    action: "Claim Rewards",
    completed: false
  }
];

export function QuickStartGuide() {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Play className="w-5 h-5 text-blue-500" />
          Quick Start Guide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {QUICK_START_STEPS.map((step, index) => (
            <div key={index} className="relative">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center relative">
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <span className="text-white font-medium">{step.step}</span>
                    )}
                  </div>
                  {index < QUICK_START_STEPS.length - 1 && (
                    <div className="w-0.5 h-6 bg-slate-600 mx-auto mt-2" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {step.icon}
                    <h4 className="text-white font-medium">{step.title}</h4>
                    {step.completed && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        Completed
                      </Badge>
                    )}
                  </div>
                  <p className="text-slate-300 text-sm mb-2">{step.description}</p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-xs"
                    disabled={step.completed}
                  >
                    {step.action}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-700">
          <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            Complete All Steps
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}