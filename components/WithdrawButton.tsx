import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';

interface WithdrawButtonProps {
    availableBalance: number;
    onWithdraw: (amount: number) => void;
}

const WithdrawButton: React.FC<WithdrawButtonProps> = ({ availableBalance, onWithdraw }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [amount, setAmount] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const handleOpenModal = () => {
        setIsModalOpen(true);
        setAmount('');
        setError(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const withdrawAmount = parseFloat(amount);

        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        if (withdrawAmount > availableBalance) {
            setError('Amount exceeds available balance.');
            return;
        }

        onWithdraw(withdrawAmount);
        setIsModalOpen(false);
    };

    return (
        <>
            <button
                onClick={handleOpenModal}
                disabled={availableBalance <= 0}
                className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium text-white transition-colors duration-300 ${availableBalance > 0
                        ? 'bg-black hover:bg-gray-800'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
            >
                <DollarSign className="w-4 h-4" />
                <span>Withdraw Funds</span>
            </button>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
                        <div className="p-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">Withdraw Funds</h3>

                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label htmlFor="amount" className="block text-gray-700 mb-2">
                                        Amount to withdraw
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <span className="text-gray-500">$</span>
                                        </div>
                                        <input
                                            type="number"
                                            id="amount"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            min="0.01"
                                            step="0.01"
                                            max={availableBalance}
                                            className="block w-full pl-8 pr-12 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                            <button
                                                type="button"
                                                onClick={() => setAmount(availableBalance.toString())}
                                                className="text-sm text-gray-900 font-medium hover:text-gray-700"
                                            >
                                                Max
                                            </button>
                                        </div>
                                    </div>
                                    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                    <div>
                                        <p className="text-sm text-gray-500">Available Balance</p>
                                        <p className="font-medium">${availableBalance.toFixed(2)}</p>
                                    </div>

                                    <div className="flex space-x-3">
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-300"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors duration-300"
                                        >
                                            Withdraw
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default WithdrawButton;