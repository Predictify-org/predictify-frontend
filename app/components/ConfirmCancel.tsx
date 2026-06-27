"use client";

import { useMemo, useState } from "react";
import { Modal } from "./Modal";

type ConfirmCancelProps = {
  action: "cancel" | "withdraw";
  amountLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  recipientLabel: string;
  requiresTypedAmount?: boolean;
};

export function ConfirmCancel({
  action,
  amountLabel,
  isOpen,
  onClose,
  onConfirm,
  recipientLabel,
  requiresTypedAmount = false,
}: ConfirmCancelProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [typedAmount, setTypedAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actionLabel = action === "cancel" ? "Cancel stream" : "Withdraw funds";
  const helperCopy = useMemo(() => {
    if (action === "cancel") {
      return "This stops future payouts and finalizes the current split between recipient payout and sender refund.";
    }

    return "This moves settled funds out of StreamPay to the destination wallet.";
  }, [action]);

  const typedAmountMatches = typedAmount.trim() === amountLabel;

  const closeAndReset = () => {
    setStep(1);
    setTypedAmount("");
    setIsSubmitting(false);
    onClose();
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      closeAndReset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeAndReset} title={actionLabel}>
      <div className="confirm-action">
        <p className="confirm-action__warning">
          This action cannot be undone.
        </p>
        <dl className="confirm-action__details">
          <div>
            <dt>Recipient</dt>
            <dd>{recipientLabel}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{amountLabel}</dd>
          </div>
        </dl>
        <p className="confirm-action__copy">{helperCopy}</p>

        {step === 1 ? (
          <div className="confirm-action__footer">
            <button className="button button--secondary" onClick={closeAndReset} type="button">
              Keep stream
            </button>
            <button className="button button--danger" onClick={() => setStep(2)} type="button">
              Continue
            </button>
          </div>
        ) : (
          <>
            {requiresTypedAmount && (
              <div className="confirm-action__input-wrap">
                <label className="confirm-action__label" htmlFor="confirm-amount">
                  Type <strong>{amountLabel}</strong> to confirm
                </label>
                <input
                  autoComplete="off"
                  className="confirm-action__input"
                  id="confirm-amount"
                  onChange={(event) => setTypedAmount(event.target.value)}
                  placeholder={amountLabel}
                  type="text"
                  value={typedAmount}
                />
              </div>
            )}

            <div className="confirm-action__footer">
              <button className="button button--secondary" onClick={() => setStep(1)} type="button">
                Back
              </button>
              <button
                className="button button--danger"
                disabled={isSubmitting || (requiresTypedAmount && !typedAmountMatches)}
                onClick={handleConfirm}
                type="button"
              >
                {isSubmitting ? "Processing..." : actionLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
