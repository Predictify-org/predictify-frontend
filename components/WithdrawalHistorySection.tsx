import React from 'react';
import { WithdrawalHistory } from '../types';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface WithdrawalHistorySectionProps {
  withdrawals: WithdrawalHistory[];
}

const WithdrawalHistorySection: React.FC<WithdrawalHistorySectionProps> = ({ withdrawals }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-gray-800" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-gray-700" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Processing';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  if (withdrawals.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 p-6 shadow-sm text-center">
        <p className="text-gray-500">No withdrawal history available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Withdrawal History</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {withdrawals.map((withdrawal) => (
          <div key={withdrawal.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200">
            <div>
              <p className="font-medium text-gray-900">${withdrawal.amount.toFixed(2)}</p>
              <p className="text-sm text-gray-500">
                {new Date(withdrawal.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(withdrawal.status)}
              <span className="text-sm font-medium">
                {getStatusText(withdrawal.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WithdrawalHistorySection;