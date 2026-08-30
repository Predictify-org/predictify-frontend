"use client";

/**
 * PredictionCommentsLoader
 *
 * Thin client-component wrapper that reads the connected wallet address from
 * WalletContext and passes it down to PredictionComments.  Keeping this as a
 * separate file lets the parent market detail page remain a Server Component.
 *
 * @see app/components/PredictionComments.tsx – the actual UI
 */

import React from "react";
import { useWalletContext } from "@/context/WalletContext";
import { PredictionComments } from "./PredictionComments";

interface PredictionCommentsLoaderProps {
  predictionId: string;
}

export default function PredictionCommentsLoader({
  predictionId,
}: PredictionCommentsLoaderProps) {
  const { address } = useWalletContext();

  return (
    <PredictionComments
      predictionId={predictionId}
      currentUserAddress={address ?? ""}
    />
  );
}
