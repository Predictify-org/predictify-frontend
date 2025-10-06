"use client"
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Issue {
  id: number;
  title: string;
  content: string;
}

interface OpenIssuesState {
  [key: number]: boolean;
}

export default function WalletIntegration() {
  const [isMainOpen, setIsMainOpen] = useState<boolean>(true);
  const [openIssues, setOpenIssues] = useState<OpenIssuesState>({});

  const issues: Issue[] = [
    { 
      id: 1, 
      title: 'Check Transaction Status',
      content: 'Verify your transaction status on the blockchain explorer. Look for confirmation numbers and ensure the transaction has been properly processed. If pending for too long, you may need to speed up the transaction with a higher gas fee.'
    },
    { 
      id: 2, 
      title: 'Insufficient Gas/Network Fees',
      content: 'Make sure you have enough native tokens (ETH, MATIC, BNB, etc.) in your wallet to cover gas fees. Transaction failures often occur due to insufficient gas. Always keep extra tokens for network fees beyond your transaction amount.'
    },
    { 
      id: 3, 
      title: 'Network Congestion',
      content: 'During high network activity, transactions may take longer or require higher gas fees. Consider waiting for off-peak hours or increasing your gas limit. Check network status on blockchain explorers for real-time congestion data.'
    }
  ];

  const toggleIssue = (issueId: number): void => {
    setOpenIssues(prev => ({
      ...prev,
      [issueId]: !prev[issueId]
    }));
  };

  return (
    <div className="min-h-screen  p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden ">
        {/* Main Header */}
        <div 
          className="bg-white px-6 py-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsMainOpen(!isMainOpen)}
        >
          <h1 className="text-xl font-bold text-gray-900">Wallet Integration</h1>
          <button className="text-purple-600 hover:text-purple-700 transition-colors">
            {isMainOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </button>
        </div>

        {/* Collapsible Content */}
        <div className={`transition-all duration-300 ease-in-out ${isMainOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
          {/* Cyan Info Banner */}
          <div className="bg-[#BDF3FF] border-l-8 border-[#00C3FF] px-6 py-4 mx-6 mt-4 ">
            <p className="text-sm text-cyan-900">
              If you're experiencing issues with transactions, here's what you can do:
            </p>
          </div>

          {/* Issues List */}
          <div className="px-6 py-2">
            {issues.map((issue: Issue, index: number) => (
              <div key={issue.id}>
                <button
                  onClick={() => toggleIssue(issue.id)}
                  className="w-full px-0 py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {issue.title}
                  </span>
                  <span className="text-purple-600">
                    {openIssues[issue.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </span>
                </button>
                
                <div className={`transition-all duration-300 ease-in-out ${openIssues[issue.id] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                  <div className="px-0 pb-3 bg-white">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {issue.content}
                    </p>
                  </div>
                </div>
                
                {index < issues.length - 1 && (
                  <div className="border-b-[1.5px] border-[#540D8D]"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}