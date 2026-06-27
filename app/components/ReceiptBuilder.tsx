"use client";

import { useState, useCallback } from "react";
import type { Stream } from "../types/openapi";
import { StreamReceipt } from "./StreamReceipt";
import { receiptCopy } from "../content/copy";

type ReceiptBuilderProps = {
  stream: Stream;
  network?: "testnet" | "mainnet";
  generatedAt?: string;
};

export function ReceiptBuilder({
  stream,
  network = "testnet",
  generatedAt,
}: ReceiptBuilderProps) {
  const [note, setNote] = useState("");
  const [shareCopied, setShareCopied] = useState(false);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleShare = useCallback(async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Stream Receipt — ${stream.label || stream.id}`,
          text: `Payment stream receipt for ${stream.label || stream.id}`,
          url,
        });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch {
        // clipboard unavailable
      }
    }
  }, [stream.label, stream.id]);

  return (
    <div className="receipt-shell">
      {/* Toolbar */}
      <div className="receipt-toolbar no-print">
        <div className="receipt-note-builder__actions">
          <button
            className="button button--primary"
            onClick={handlePrint}
            type="button"
          >
            {receiptCopy.print}
          </button>
          <button
            className={`receipt-share-btn${shareCopied ? " receipt-share-btn--copied" : ""}`}
            onClick={handleShare}
            type="button"
          >
            {shareCopied ? receiptCopy.shareCopied : receiptCopy.share}
          </button>
        </div>
      </div>

      {/* Note builder */}
      <div className="receipt-note-builder no-print">
        <label className="receipt-note-builder__label" htmlFor="receipt-note">
          {receiptCopy.noteLabel}
        </label>
        <textarea
          className="receipt-note-builder__textarea"
          id="receipt-note"
          onChange={(e) => setNote(e.target.value)}
          placeholder={receiptCopy.notePlaceholder}
          value={note}
        />
        <p className="receipt-note-builder__helper">{receiptCopy.noteHelper}</p>
      </div>

      {/* Receipt document */}
      <StreamReceipt
        generatedAt={generatedAt}
        hideToolbar
        network={network}
        note={note}
        stream={stream}
      />
    </div>
  );
}
