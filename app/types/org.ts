export interface Org {
  id: string;
  name: string;
  ownerWallet: string;
}

export interface Member {
  orgId: string;
  walletAddress: string;
  role: 'owner' | 'member';
}
