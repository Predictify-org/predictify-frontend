"use client";
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Step {
  id: number;
  title: string;
}

interface OpenStepsState {
  [key: number]: boolean;
}

export default function WalletConnectionIssues() {
  const [isMainOpen, setIsMainOpen] = useState<boolean>(true);
  const [openSteps, setOpenSteps] = useState<OpenStepsState>({});

  const steps: Step[] = [
    { id: 1, title: 'Check Your Browser' },
    { id: 2, title: 'Update Wallet Extension' },
    { id: 3, title: 'Clear Browser Cache' },
    { id: 4, title: 'Try Incognito Mode' }
  ];

  const toggleStep = (stepId: number): void => {
    setOpenSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  return (
    <div className="min-h-screen  p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border-4 border-purple-600">
        {/* Main Header */}
        <div 
          className="bg-white px-6 py-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsMainOpen(!isMainOpen)}
        >
          <h1 className="text-xl font-bold text-gray-900">Wallet connection issues</h1>
          <button className="text-purple-600 hover:text-purple-700 transition-colors">
            {isMainOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </button>
        </div>

        {/* Collapsible Content */}
        <div className={`transition-all duration-300 ease-in-out ${isMainOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
          {/* Yellow Banner */}
          <div className="bg-yellow-100 border-l-4 border-yellow-400 px-6 py-4 mx-6 mt-4 rounded">
            <p className="text-sm text-gray-800">
              Most wallet connection issues can be resolve by the following steps
            </p>
          </div>

          {/* Steps */}
          <div className="px-6 py-4 space-y-3">
            {steps.map((step: Step) => (
              <div key={step.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleStep(step.id)}
                  className="w-full px-5 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">
                    Step {step.id}: {step.title}
                  </span>
                  <span className="text-purple-600">
                    {openSteps[step.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </span>
                </button>
                
                <div className={`transition-all duration-300 ease-in-out ${openSteps[step.id] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                  <div className="px-5 py-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Detailed instructions for {step.title.toLowerCase()} would appear here. 
                      Follow these guidelines to resolve your wallet connection issues.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Support Banner */}
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg px-6 py-4 mx-6 mb-6 mt-2">
            <p className="text-sm text-cyan-900 text-center">
              If you still experience issues after trying all these steps, please contact our support team for assistance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}