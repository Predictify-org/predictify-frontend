import { Bet, WithdrawalHistory, UserBalance } from '../types';

export const mockBets: Bet[] = [
    {
        id: '1',
        eventName: 'Lakers vs. Warriors',
        betAmount: 50,
        outcome: 'win',
        odds: 2.1,
        payout: 105,
        fees: 5.25,
        date: '2025-01-15',
        category: 'Basketball'
    },
    {
        id: '2',
        eventName: 'Chiefs vs. Bills',
        betAmount: 100,
        outcome: 'loss',
        odds: 1.8,
        payout: 0,
        fees: 0,
        date: '2025-01-12',
        category: 'Football'
    },
    {
        id: '3',
        eventName: 'McGregor vs. Poirier',
        betAmount: 75,
        outcome: 'win',
        odds: 3.2,
        payout: 240,
        fees: 12,
        date: '2025-01-10',
        category: 'MMA'
    },
    {
        id: '4',
        eventName: 'Yankees vs. Red Sox',
        betAmount: 25,
        outcome: 'push',
        odds: 1.95,
        payout: 25,
        fees: 0,
        date: '2025-01-08',
        category: 'Baseball'
    },
    {
        id: '5',
        eventName: 'Liverpool vs. Manchester City',
        betAmount: 60,
        outcome: 'win',
        odds: 2.5,
        payout: 150,
        fees: 7.5,
        date: '2025-01-05',
        category: 'Soccer'
    },
    {
        id: '6',
        eventName: 'Djokovic vs. Nadal',
        betAmount: 40,
        outcome: 'loss',
        odds: 1.75,
        payout: 0,
        fees: 0,
        date: '2025-01-03',
        category: 'Tennis'
    }
];

export const mockWithdrawalHistory: WithdrawalHistory[] = [
    {
        id: 'w1',
        amount: 200,
        date: '2025-01-14',
        status: 'completed'
    },
    {
        id: 'w2',
        amount: 150,
        date: '2025-01-07',
        status: 'completed'
    },
    {
        id: 'w3',
        amount: 100,
        date: '2025-01-01',
        status: 'pending'
    }
];

export const mockUserBalance: UserBalance = {
    available: 245.25,
    pending: 100,
    totalWinnings: 495,
    totalWithdrawn: 350
};