"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import { CopyAddress } from "../components/CopyAddress";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { useToast } from "../hooks/useToast";
import {
  FederationError,
  isFederationAddress,
  resolveFederationAddress,
} from "../utils/federation";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  label: string;
  /** Resolved Stellar account ID (G…) */
  address: string;
  /** Original federation address when the user entered one (user*domain.com) */
  federationAddress?: string;
  memo?: string;
  createdAt: string;
}

// ─── localStorage persistence ─────────────────────────────────────────────────

const CONTACTS_KEY = "streampay_contacts";

function loadContacts(): Contact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    return raw ? (JSON.parse(raw) as Contact[]) : [];
  } catch {
    return [];
  }
}

function persistContacts(contacts: Contact[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

// ─── Validation ───────────────────────────────────────────────────────────────

// Stellar ED25519 public key: G + 55 base-32 chars (A–Z, 2–7)
const STELLAR_ACCOUNT_RE = /^G[A-Z2-7]{55}$/;

function isValidStellarAddress(value: string): boolean {
  return STELLAR_ACCOUNT_RE.test(value);
}

// ─── ContactForm ──────────────────────────────────────────────────────────────

interface FormValues {
  label: string;
  address: string;
  memo: string;
}

interface FormSubmitResult extends FormValues {
  resolvedAddress: string;
  federationAddress?: string;
}

interface ContactFormProps {
  initial?: FormValues;
  onSubmit: (result: FormSubmitResult) => void;
  onCancel: () => void;
  submitLabel: string;
}

function ContactForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: ContactFormProps) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");

  const [resolving, setResolving] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [federationAddress, setFederationAddress] = useState<
    string | undefined
  >();
  const [resolveError, setResolveError] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"label" | "address" | "memo", string>>>(
    {},
  );

  const labelId = useId();
  const addressId = useId();
  const memoId = useId();

  const handleAddressBlur = useCallback(async () => {
    const trimmed = address.trim();
    if (!trimmed) return;

    setResolveError("");

    if (isFederationAddress(trimmed)) {
      setResolving(true);
      try {
        const record = await resolveFederationAddress(trimmed);
        setResolvedAddress(record.account_id);
        setFederationAddress(trimmed);
        setErrors((prev) => ({ ...prev, address: undefined }));
      } catch (err) {
        const msg =
          err instanceof FederationError
            ? err.message
            : "Failed to resolve federation address";
        setResolveError(msg);
        setResolvedAddress("");
        setFederationAddress(undefined);
      } finally {
        setResolving(false);
      }
    } else if (isValidStellarAddress(trimmed)) {
      setResolvedAddress(trimmed);
      setFederationAddress(undefined);
    } else {
      setResolvedAddress("");
      setFederationAddress(undefined);
    }
  }, [address]);

  const validate = (): boolean => {
    const next: typeof errors = {};

    if (!label.trim()) {
      next.label = "Label is required";
    } else if (label.trim().length > 64) {
      next.label = "Label must be 64 characters or fewer";
    }

    const trimmed = address.trim();
    if (!trimmed) {
      next.address = "Address is required";
    } else if (
      !isFederationAddress(trimmed) &&
      !isValidStellarAddress(trimmed)
    ) {
      next.address =
        "Enter a valid Stellar address (G…) or federation address (user*domain.com)";
    } else if (isFederationAddress(trimmed) && !resolvedAddress) {
      next.address =
        resolveError || "Resolve the federation address before saving";
    }

    if (memo.length > 256) {
      next.memo = "Note must be 256 characters or fewer";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      label: label.trim(),
      address: address.trim(),
      memo: memo.trim(),
      resolvedAddress: resolvedAddress || address.trim(),
      federationAddress,
    });
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem 1rem",
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    color: "var(--foreground)",
    fontSize: "1rem",
    outline: "none",
  };

  const fieldErrorStyle: React.CSSProperties = {
    ...fieldStyle,
    borderColor: "var(--system-error-border)",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--muted-foreground)",
    marginBottom: "0.5rem",
  };

  const errorMsgStyle: React.CSSProperties = {
    color: "var(--system-error-text)",
    fontSize: "0.8rem",
    marginTop: "0.375rem",
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* Label */}
        <div>
          <label htmlFor={labelId} style={labelStyle}>
            Label
          </label>
          <input
            id={labelId}
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Alice Design Studio"
            maxLength={65}
            aria-required="true"
            aria-invalid={!!errors.label}
            aria-describedby={errors.label ? `${labelId}-err` : undefined}
            style={errors.label ? fieldErrorStyle : fieldStyle}
          />
          {errors.label && (
            <p id={`${labelId}-err`} role="alert" style={errorMsgStyle}>
              {errors.label}
            </p>
          )}
        </div>

        {/* Address */}
        <div>
          <label htmlFor={addressId} style={labelStyle}>
            Stellar address or federation address
          </label>
          <div style={{ position: "relative" }}>
            <input
              id={addressId}
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setResolvedAddress("");
                setFederationAddress(undefined);
                setResolveError("");
              }}
              onBlur={handleAddressBlur}
              placeholder="GABC… or user*domain.com"
              aria-required="true"
              aria-invalid={!!(errors.address || resolveError)}
              aria-describedby={
                [
                  errors.address || resolveError ? `${addressId}-err` : "",
                  resolvedAddress ? `${addressId}-resolved` : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              style={{
                ...(errors.address || resolveError
                  ? fieldErrorStyle
                  : fieldStyle),
                paddingRight: resolving ? "3rem" : "1rem",
                fontFamily: "monospace",
              }}
            />
            {resolving && (
              <span
                aria-label="Resolving federation address…"
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted)",
                  fontSize: "0.875rem",
                  pointerEvents: "none",
                }}
              >
                ⟳
              </span>
            )}
          </div>

          {resolvedAddress && isFederationAddress(address.trim()) && (
            <p
              id={`${addressId}-resolved`}
              style={{
                fontSize: "0.8rem",
                color: "var(--system-success-text)",
                marginTop: "0.375rem",
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}
            >
              Resolved: {resolvedAddress}
            </p>
          )}

          {(errors.address || resolveError) && (
            <p id={`${addressId}-err`} role="alert" style={errorMsgStyle}>
              {errors.address || resolveError}
            </p>
          )}
        </div>

        {/* Memo */}
        <div>
          <label htmlFor={memoId} style={labelStyle}>
            Note{" "}
            <span style={{ fontWeight: 400, textTransform: "none" }}>
              (optional)
            </span>
          </label>
          <input
            id={memoId}
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="e.g. Design retainer for Q3"
            maxLength={257}
            aria-invalid={!!errors.memo}
            aria-describedby={errors.memo ? `${memoId}-err` : undefined}
            style={errors.memo ? fieldErrorStyle : fieldStyle}
          />
          {errors.memo && (
            <p id={`${memoId}-err`} role="alert" style={errorMsgStyle}>
              {errors.memo}
            </p>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "flex-end",
            paddingTop: "0.5rem",
          }}
        >
          <button
            type="button"
            className="button button--secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button button--primary"
            disabled={resolving}
          >
            {resolving ? "Resolving…" : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── ContactRow ───────────────────────────────────────────────────────────────

interface ContactRowProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
}

function ContactRow({ contact, onEdit, onDelete }: ContactRowProps) {
  return (
    <article
      className="activity-card"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "1rem",
        alignItems: "center",
      }}
      aria-label={`Contact: ${contact.label}`}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <strong style={{ fontSize: "1rem", fontWeight: 700 }}>
            {contact.label}
          </strong>
          {contact.federationAddress && (
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--muted)",
                fontFamily: "monospace",
              }}
            >
              {contact.federationAddress}
            </span>
          )}
        </div>

        <div style={{ marginTop: "0.25rem" }}>
          <CopyAddress value={contact.address} truncateChars={8} />
        </div>

        {contact.memo && (
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--muted-foreground)",
              marginTop: "0.25rem",
            }}
          >
            {contact.memo}
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onEdit(contact)}
          aria-label={`Edit contact ${contact.label}`}
          style={{ padding: "0.375rem 0.875rem", fontSize: "0.875rem" }}
        >
          Edit
        </button>
        <button
          type="button"
          className="button button--danger"
          onClick={() => onDelete(contact.id)}
          aria-label={`Delete contact ${contact.label}`}
          style={{ padding: "0.375rem 0.875rem", fontSize: "0.875rem" }}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const searchId = useId();
  const toast = useToast();

  useEffect(() => {
    setContacts(loadContacts());
  }, []);

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.label.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      (c.federationAddress?.toLowerCase().includes(q) ?? false) ||
      (c.memo?.toLowerCase().includes(q) ?? false)
    );
  });

  const applyUpdate = (next: Contact[]) => {
    setContacts(next);
    persistContacts(next);
  };

  const handleAdd = ({
    label,
    memo,
    resolvedAddress,
    federationAddress,
  }: FormSubmitResult) => {
    const contact: Contact = {
      id: crypto.randomUUID(),
      label,
      address: resolvedAddress,
      federationAddress,
      memo: memo || undefined,
      createdAt: new Date().toISOString(),
    };
    applyUpdate([...contacts, contact]);
    setAddOpen(false);
    toast.success(`Contact "${label}" added`);
  };

  const handleEdit = ({
    label,
    memo,
    resolvedAddress,
    federationAddress,
  }: FormSubmitResult) => {
    if (!editTarget) return;
    applyUpdate(
      contacts.map((c) =>
        c.id === editTarget.id
          ? {
              ...c,
              label,
              address: resolvedAddress,
              federationAddress,
              memo: memo || undefined,
            }
          : c,
      ),
    );
    setEditTarget(null);
    toast.success(`Contact "${label}" updated`);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    const target = contacts.find((c) => c.id === deleteId);
    applyUpdate(contacts.filter((c) => c.id !== deleteId));
    setDeleteId(null);
    if (target) toast.success(`Contact "${target.label}" deleted`);
  };

  const deleteTarget = contacts.find((c) => c.id === deleteId);

  return (
    <main className="page-shell">
      <header className="page-hero">
        <div className="page-hero__content">
          <p className="page-hero__eyebrow">Contacts</p>
          <h1 className="page-hero__title">Address Book</h1>
          <p className="page-hero__description">
            Save Stellar addresses with labels. Enter a federation address
            (user*domain.com) to resolve it automatically.
          </p>
        </div>
      </header>

      <div style={{ maxWidth: "48rem", width: "100%", margin: "0 auto" }}>

        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label
              htmlFor={searchId}
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: "hidden",
                clip: "rect(0,0,0,0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
            >
              Search contacts
            </label>
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by label, address, or note…"
              style={{
                width: "100%",
                padding: "0.625rem 1rem",
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                color: "var(--foreground)",
                fontSize: "0.9375rem",
                outline: "none",
              }}
            />
          </div>

          <button
            type="button"
            className="button button--primary"
            onClick={() => setAddOpen(true)}
          >
            + Add contact
          </button>
        </div>

        {/* Count */}
        {contacts.length > 0 && (
          <p
            aria-live="polite"
            style={{
              fontSize: "0.8rem",
              color: "var(--muted)",
              marginBottom: "1rem",
            }}
          >
            {filtered.length === contacts.length
              ? `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`
              : `${filtered.length} of ${contacts.length} contacts`}
          </p>
        )}

        {/* List */}
        {contacts.length === 0 ? (
          <EmptyState
            eyebrow="Contacts"
            title="No contacts yet"
            description="Add a Stellar address with a label so you can find it quickly when setting up a payment stream."
            actionLabel="Add your first contact"
          />
        ) : filtered.length === 0 ? (
          <p
            role="status"
            style={{
              color: "var(--muted-foreground)",
              textAlign: "center",
              padding: "3rem 0",
            }}
          >
            No contacts match <strong>{search}</strong>
          </p>
        ) : (
          <section aria-label="Contact list">
            <ul
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {filtered.map((contact) => (
                <li key={contact.id}>
                  <ContactRow
                    contact={contact}
                    onEdit={setEditTarget}
                    onDelete={setDeleteId}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Add modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add contact">
        <ContactForm
          onSubmit={handleAdd}
          onCancel={() => setAddOpen(false)}
          submitLabel="Add contact"
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Edit contact"
      >
        {editTarget && (
          <ContactForm
            initial={{
              label: editTarget.label,
              address: editTarget.federationAddress ?? editTarget.address,
              memo: editTarget.memo ?? "",
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            submitLabel="Save changes"
          />
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete contact"
      >
        <p style={{ color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>
          Are you sure you want to delete{" "}
          <strong>{deleteTarget?.label}</strong>? This action cannot be undone.
        </p>
        <div
          style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}
        >
          <button
            type="button"
            className="button button--secondary"
            onClick={() => setDeleteId(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={confirmDelete}
          >
            Delete
          </button>
        </div>
      </Modal>
    </main>
  );
}
