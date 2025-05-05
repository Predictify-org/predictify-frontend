import BettingHistory from '@/components/BettingHistory'
import { mockBets, mockUserBalance, mockWithdrawalHistory } from '@/data/mokeData'
import React from 'react'

const page = () => {
    return (
        <BettingHistory
            bets={mockBets}
            userBalance={mockUserBalance}
            withdrawalHistory={mockWithdrawalHistory}
        />
    )
}

export default page
