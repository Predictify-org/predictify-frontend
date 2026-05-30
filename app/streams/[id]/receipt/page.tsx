import { notFound } from "next/navigation";
import { StreamReceipt } from "../../../components/StreamReceipt";
import type { Stream } from "../../../types/openapi";

// Placeholder streams that match the mock data used across the app.
// Replace with a real API/DB fetch once the data layer is wired.
const MOCK_STREAMS: Record<string, Stream> = {
  "stream-ada": {
    id: "stream-ada",
    recipient: "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3JKAKZK7G",
    rate: "120 XLM / month",
    schedule: "Pays every 30 days",
    status: "active",
    label: "Ada Creative Studio",
    email: "ada@example.com",
    createdAt: "2024-11-01T09:00:00.000Z",
    updatedAt: "2024-11-20T14:30:00.000Z",
    settlementTxHash:
      "c3f8a12e4b76d09e1a23f456bc78d90e1f234a5678b9c0d1e2f3a4b5c6d7e8f9",
    token: "XLM",
  },
  "stream-kemi": {
    id: "stream-kemi",
    recipient: "GBVZZ5QKXB4T2YXQXDXQ2ZQKXB4T2YXQXDXQ2ZQKXB4T2YXQXDXQ2Z",
    rate: "32 XLM / week",
    schedule: "Draft stream ready to launch",
    status: "draft",
    label: "Kemi Onboarding Support",
    createdAt: "2024-11-15T11:00:00.000Z",
    updatedAt: "2024-11-15T11:00:00.000Z",
    token: "XLM",
  },
  "stream-yusuf": {
    id: "stream-yusuf",
    recipient: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGYWDEAVQBMJ87WGNB55IAA",
    rate: "18 XLM / day",
    schedule: "Ended yesterday with funds available",
    status: "ended",
    label: "Yusuf QA Partnership",
    createdAt: "2024-10-01T08:00:00.000Z",
    updatedAt: "2024-11-19T17:45:00.000Z",
    settlementTxHash:
      "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    withdrawal: {
      state: "pending",
      requestedAt: "2024-11-19T18:00:00.000Z",
      lastCheckedAt: "2024-11-19T18:05:00.000Z",
      attempts: 1,
    },
    token: "XLM",
  },
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function StreamReceiptPage({ params }: Props) {
  const { id } = await params;
  const stream = MOCK_STREAMS[id];

  if (!stream) notFound();

  const network =
    process.env.STELLAR_NETWORK === "mainnet" ? "mainnet" : "testnet";

  return (
    <StreamReceipt
      generatedAt={new Date().toISOString()}
      network={network}
      stream={stream}
    />
  );
}

export async function generateStaticParams() {
  return Object.keys(MOCK_STREAMS).map((id) => ({ id }));
}

export function generateMetadata() {
  return {
    title: "Stream Receipt — StreamPay",
    description: "Print-friendly payment stream summary",
  };
}
