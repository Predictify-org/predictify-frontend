"use client";

import React, { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ALBEDO_ID, FREIGHTER_ID, LOBSTR_ID, RABET_ID, XBULL_ID } from "@creit.tech/stellar-wallets-kit";
import { getKit } from "@/constants/wallet-kits.constant";

export type WalletErrorKind = "unauthenticated" | "forbidden" | "user_rejected" | "wallet_locked" | "identity_changed" | "validation" | "network" | "conflict" | "unknown";
export type WalletOperationKind = "connect" | "disconnect" | "reconcile";
export type WalletOperationStatus = "idle" | "connecting" | "disconnecting" | "reconciling";

export interface WalletOperationFailure {
  success: false;
  error: string;
  errorKind: WalletErrorKind;
  operationId?: number;
}

export interface WalletConnectSuccess { success: true; address: string; operationId: number }
export interface WalletDisconnectSuccess { success: true; operationId: number }
export type WalletConnectResult = WalletConnectSuccess | WalletOperationFailure;
export type WalletDisconnectResult = WalletDisconnectSuccess | WalletOperationFailure;

interface WalletContextType {
  address: string | null;
  name: string | null;
  connected: boolean;
  isLoading: boolean;
  operationStatus: WalletOperationStatus;
  activeOperationId: number | null;
  operationError: WalletOperationFailure | null;
  identityGeneration: number;
  connectWallet: (walletId: string) => Promise<WalletConnectResult>;
  disconnectWallet: () => Promise<WalletDisconnectResult>;
  clearOperationError: () => void;
  isIdentityCurrent: (address: string, generation: number) => boolean;
}

interface PersistedWalletState { address: string; name: string; connected: true }
interface ActiveOperation { id: number; kind: WalletOperationKind }

const WalletContext = createContext<WalletContextType | undefined>(undefined);
const WALLET_STORAGE_KEY = "predictify_wallet_state";

const WALLET_NAMES: Record<string, string> = {
  [FREIGHTER_ID]: "Freighter",
  [LOBSTR_ID]: "LOBSTR",
  [XBULL_ID]: "XBull",
  [ALBEDO_ID]: "Albedo",
  [RABET_ID]: "Rabet",
};

const WALLET_IDS_BY_NAME = Object.fromEntries(
  Object.entries(WALLET_NAMES).map(([id, name]) => [name.toLowerCase(), id]),
) as Record<string, string>;

function isValidStellarAddress(value: unknown): value is string {
  return typeof value === "string" && /^G[A-Z2-7]{55}$/.test(value);
}

function parsePersistedWalletState(raw: string | null): PersistedWalletState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PersistedWalletState>;
    if (value.connected !== true || !isValidStellarAddress(value.address) || typeof value.name !== "string" || !WALLET_IDS_BY_NAME[value.name.toLowerCase()]) return null;
    return { address: value.address, name: value.name, connected: true };
  } catch {
    return null;
  }
}

export function classifyWalletError(error: unknown): WalletOperationFailure {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (/reject|denied|cancel|cancelled|user aborted/.test(message)) return { success: false, error: "The wallet request was cancelled.", errorKind: "user_rejected" };
  if (/lock|unlock|logged out/.test(message)) return { success: false, error: "Unlock your wallet and try again.", errorKind: "wallet_locked" };
  if (/network|offline|timeout|timed out|fetch|connection/.test(message)) return { success: false, error: "The wallet could not be reached. Check your connection and try again.", errorKind: "network" };
  return { success: false, error: "The wallet operation could not be completed. Try again.", errorKind: "unknown" };
}

function conflictFailure(operationId?: number): WalletOperationFailure {
  return { success: false, error: "Another wallet operation is already in progress.", errorKind: "conflict", operationId };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [operationStatus, setOperationStatus] = useState<WalletOperationStatus>("idle");
  const [activeOperationId, setActiveOperationId] = useState<number | null>(null);
  const [operationError, setOperationError] = useState<WalletOperationFailure | null>(null);
  const [identityGeneration, setIdentityGeneration] = useState(0);
  const activeOperationRef = useRef<ActiveOperation | null>(null);
  const nextOperationIdRef = useRef(0);
  const identityRef = useRef({ address: null as string | null, generation: 0 });

  const updateIdentity = useCallback((nextAddress: string | null, nextName: string | null) => {
    const nextGeneration = identityRef.current.generation + 1;
    identityRef.current = { address: nextAddress, generation: nextGeneration };
    setAddress(nextAddress);
    setName(nextName);
    setConnected(Boolean(nextAddress && nextName));
    setIdentityGeneration(nextGeneration);
  }, []);

  const startOperation = useCallback((kind: WalletOperationKind, preemptConnect = false) => {
    const active = activeOperationRef.current;
    if (active && !(preemptConnect && active.kind === "connect")) return null;
    // A new generation makes every provider callback from a preempted operation stale.
    const operation = { id: ++nextOperationIdRef.current, kind };
    activeOperationRef.current = operation;
    setActiveOperationId(operation.id);
    setOperationStatus(kind === "connect" ? "connecting" : kind === "disconnect" ? "disconnecting" : "reconciling");
    setOperationError(null);
    return operation;
  }, []);

  const isOperationCurrent = useCallback((operation: ActiveOperation) => activeOperationRef.current?.id === operation.id, []);
  const finishOperation = useCallback((operation: ActiveOperation) => {
    if (activeOperationRef.current?.id !== operation.id) return;
    activeOperationRef.current = null;
    setActiveOperationId(null);
    setOperationStatus("idle");
  }, []);

  const connectWallet = useCallback(async (walletId: string): Promise<WalletConnectResult> => {
    const walletName = WALLET_NAMES[walletId];
    if (!walletName) {
      const failure: WalletOperationFailure = { success: false, error: "This wallet provider is not supported.", errorKind: "validation" };
      setOperationError(failure);
      return failure;
    }
    const operation = startOperation("connect");
    if (!operation) return conflictFailure(activeOperationRef.current?.id);
    try {
      const kit = getKit();
      kit.setWallet(walletId);
      const result = await kit.getAddress();
      // Results only commit while their operation ID is still current.
      if (!isOperationCurrent(operation)) return conflictFailure(operation.id);
      if (!isValidStellarAddress(result.address)) {
        const failure: WalletOperationFailure = { success: false, error: "The wallet returned an invalid Stellar address.", errorKind: "validation", operationId: operation.id };
        setOperationError(failure);
        return failure;
      }
      updateIdentity(result.address, walletName);
      return { success: true, address: result.address, operationId: operation.id };
    } catch (error: unknown) {
      if (!isOperationCurrent(operation)) return conflictFailure(operation.id);
      const failure = { ...classifyWalletError(error), operationId: operation.id };
      setOperationError(failure);
      return failure;
    } finally {
      finishOperation(operation);
    }
  }, [finishOperation, isOperationCurrent, startOperation, updateIdentity]);

  const disconnectWallet = useCallback(async (): Promise<WalletDisconnectResult> => {
    // Disconnect is a safety boundary and preempts any in-flight connect.
    const operation = startOperation("disconnect", true);
    if (!operation) return conflictFailure(activeOperationRef.current?.id);
    try {
      await getKit().disconnect();
      if (!isOperationCurrent(operation)) return conflictFailure(operation.id);
      updateIdentity(null, null);
      return { success: true, operationId: operation.id };
    } catch (error: unknown) {
      if (!isOperationCurrent(operation)) return conflictFailure(operation.id);
      const failure = { ...classifyWalletError(error), operationId: operation.id };
      setOperationError(failure);
      return failure;
    } finally {
      finishOperation(operation);
    }
  }, [finishOperation, isOperationCurrent, startOperation, updateIdentity]);

  useEffect(() => {
    let mounted = true;
    const persisted = parsePersistedWalletState(localStorage.getItem(WALLET_STORAGE_KEY));
    if (!persisted) {
      localStorage.removeItem(WALLET_STORAGE_KEY);
      setIsLoading(false);
      return () => { mounted = false; };
    }

    // Stored account data is metadata, never proof of a live wallet session.
    const operation = startOperation("reconcile");
    if (!operation) {
      setIsLoading(false);
      return () => { mounted = false; };
    }
    const reconcile = async () => {
      try {
        const kit = getKit();
        kit.setWallet(WALLET_IDS_BY_NAME[persisted.name.toLowerCase()]);
        const result = await kit.getAddress();
        if (!mounted || !isOperationCurrent(operation)) return;
        if (result.address !== persisted.address || !isValidStellarAddress(result.address)) {
          localStorage.removeItem(WALLET_STORAGE_KEY);
          setOperationError({ success: false, error: "The active wallet account changed. Connect it again to continue.", errorKind: "identity_changed", operationId: operation.id });
          return;
        }
        updateIdentity(persisted.address, persisted.name);
      } catch {
        if (mounted && isOperationCurrent(operation)) {
          localStorage.removeItem(WALLET_STORAGE_KEY);
          setOperationError({ success: false, error: "Reconnect your wallet to continue.", errorKind: "wallet_locked", operationId: operation.id });
        }
      } finally {
        if (mounted) {
          finishOperation(operation);
          setIsLoading(false);
        }
      }
    };
    void reconcile();
    return () => {
      mounted = false;
      if (activeOperationRef.current?.id === operation.id) activeOperationRef.current = null;
    };
  }, [finishOperation, isOperationCurrent, startOperation, updateIdentity]);

  useEffect(() => {
    if (isLoading) return;
    try {
      if (connected && address && name) localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify({ address, name, connected: true }));
      else localStorage.removeItem(WALLET_STORAGE_KEY);
    } catch {
      // Storage failure cannot change the verified in-memory identity.
    }
  }, [address, connected, isLoading, name]);

  const isIdentityCurrent = useCallback((expectedAddress: string, generation: number) => identityRef.current.address === expectedAddress && identityRef.current.generation === generation, []);
  const clearOperationError = useCallback(() => setOperationError(null), []);
  const value = useMemo<WalletContextType>(() => ({ address, name, connected, isLoading, operationStatus, activeOperationId, operationError, identityGeneration, connectWallet, disconnectWallet, clearOperationError, isIdentityCurrent }), [activeOperationId, address, clearOperationError, connectWallet, connected, disconnectWallet, identityGeneration, isIdentityCurrent, isLoading, name, operationError, operationStatus]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (context === undefined) throw new Error("useWalletContext must be used within a WalletProvider");
  return context;
}

export const walletStateValidation = { isValidStellarAddress, parsePersistedWalletState };
