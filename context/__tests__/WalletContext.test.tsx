import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { WalletProvider, useWalletContext, walletStateValidation } from "@/context/WalletContext";

jest.mock("@creit.tech/stellar-wallets-kit", () => ({
  ALBEDO_ID: "albedo",
  FREIGHTER_ID: "freighter",
  LOBSTR_ID: "lobstr",
  RABET_ID: "rabet",
  XBULL_ID: "xbull",
}));

const mockSetWallet = jest.fn();
const mockGetAddress = jest.fn();
const mockDisconnect = jest.fn();

jest.mock("@/constants/wallet-kits.constant", () => ({
  getKit: () => ({
    setWallet: mockSetWallet,
    getAddress: mockGetAddress,
    disconnect: mockDisconnect,
  }),
}));

const ADDRESS_A = `G${"A".repeat(55)}`;
const ADDRESS_B = `G${"B".repeat(55)}`;

function wrapper({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe("WalletProvider operation coordinator", () => {
  beforeEach(() => {
    localStorage.clear();
    mockSetWallet.mockReset();
    mockGetAddress.mockReset();
    mockDisconnect.mockReset();
  });

  async function renderWallet() {
    const hook = renderHook(() => useWalletContext(), { wrapper });
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    return hook;
  }

  it("connects once and preserves the public state shape", async () => {
    mockGetAddress.mockResolvedValue({ address: ADDRESS_A });
    const hook = await renderWallet();
    let result: Awaited<ReturnType<typeof hook.result.current.connectWallet>> | undefined;
    await act(async () => { result = await hook.result.current.connectWallet("freighter"); });

    expect(result).toMatchObject({ success: true, address: ADDRESS_A });
    expect(mockSetWallet).toHaveBeenCalledWith("freighter");
    expect(hook.result.current).toEqual(expect.objectContaining({
      address: ADDRESS_A,
      name: "Freighter",
      connected: true,
      connectWallet: expect.any(Function),
      disconnectWallet: expect.any(Function),
    }));
  });

  it("disconnects successfully and invalidates the identity generation", async () => {
    mockGetAddress.mockResolvedValue({ address: ADDRESS_A });
    mockDisconnect.mockResolvedValue(undefined);
    const hook = await renderWallet();
    await act(async () => { await hook.result.current.connectWallet("freighter"); });
    const connectedGeneration = hook.result.current.identityGeneration;
    await act(async () => { await hook.result.current.disconnectWallet(); });

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(hook.result.current.connected).toBe(false);
    expect(hook.result.current.identityGeneration).toBeGreaterThan(connectedGeneration);
  });

  it("classifies a rejected provider request without logging the raw error", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockGetAddress.mockRejectedValue(new Error(`User rejected ${ADDRESS_A}`));
    const hook = await renderWallet();
    let result: unknown;
    await act(async () => { result = await hook.result.current.connectWallet("freighter"); });

    expect(result).toMatchObject({ success: false, errorKind: "user_rejected", error: "The wallet request was cancelled." });
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("rejects an unknown provider before invoking the wallet kit", async () => {
    const hook = await renderWallet();
    let result: unknown;
    await act(async () => { result = await hook.result.current.connectWallet("not-a-wallet"); });
    expect(result).toMatchObject({ success: false, errorKind: "validation" });
    expect(mockSetWallet).not.toHaveBeenCalled();
    expect(mockGetAddress).not.toHaveBeenCalled();
  });

  it("removes malformed persisted state instead of trusting it", async () => {
    localStorage.setItem("predictify_wallet_state", JSON.stringify({ address: "bad", name: "Freighter", connected: true }));
    const hook = await renderWallet();
    expect(hook.result.current.connected).toBe(false);
    expect(localStorage.getItem("predictify_wallet_state")).toBeNull();
    expect(mockGetAddress).not.toHaveBeenCalled();
  });

  it("allows only one concurrent provider attempt globally", async () => {
    const pending = deferred<{ address: string }>();
    mockGetAddress.mockReturnValueOnce(pending.promise);
    const hook = await renderWallet();
    let first!: ReturnType<typeof hook.result.current.connectWallet>;
    let secondResult: unknown;
    act(() => { first = hook.result.current.connectWallet("freighter"); });
    await act(async () => { secondResult = await hook.result.current.connectWallet("lobstr"); });

    expect(secondResult).toMatchObject({ success: false, errorKind: "conflict" });
    expect(mockGetAddress).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve({ address: ADDRESS_A }); await first; });
  });

  it("deduplicates disconnect attempts", async () => {
    mockGetAddress.mockResolvedValue({ address: ADDRESS_A });
    const pending = deferred<void>();
    mockDisconnect.mockReturnValue(pending.promise);
    const hook = await renderWallet();
    await act(async () => { await hook.result.current.connectWallet("freighter"); });
    let first!: ReturnType<typeof hook.result.current.disconnectWallet>;
    let secondResult: unknown;
    act(() => { first = hook.result.current.disconnectWallet(); });
    await act(async () => { secondResult = await hook.result.current.disconnectWallet(); });

    expect(secondResult).toMatchObject({ success: false, errorKind: "conflict" });
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve(); await first; });
  });

  it("prevents a stale connect from committing after disconnect", async () => {
    const pendingConnect = deferred<{ address: string }>();
    mockGetAddress.mockReturnValue(pendingConnect.promise);
    mockDisconnect.mockResolvedValue(undefined);
    const hook = await renderWallet();
    let connectPromise!: ReturnType<typeof hook.result.current.connectWallet>;
    act(() => { connectPromise = hook.result.current.connectWallet("freighter"); });
    await act(async () => { await hook.result.current.disconnectWallet(); });
    let staleResult: unknown;
    await act(async () => { pendingConnect.resolve({ address: ADDRESS_A }); staleResult = await connectPromise; });

    expect(staleResult).toMatchObject({ success: false, errorKind: "conflict" });
    expect(hook.result.current.connected).toBe(false);
  });

  it("rejects a stale result after a newer connect operation", async () => {
    const firstConnect = deferred<{ address: string }>();
    mockGetAddress.mockReturnValueOnce(firstConnect.promise).mockResolvedValueOnce({ address: ADDRESS_B });
    mockDisconnect.mockResolvedValue(undefined);
    const hook = await renderWallet();
    let stalePromise!: ReturnType<typeof hook.result.current.connectWallet>;
    act(() => { stalePromise = hook.result.current.connectWallet("freighter"); });
    await act(async () => { await hook.result.current.disconnectWallet(); });
    await act(async () => { await hook.result.current.connectWallet("lobstr"); });
    await act(async () => { firstConnect.resolve({ address: ADDRESS_A }); await stalePromise; });

    expect(hook.result.current.address).toBe(ADDRESS_B);
    expect(hook.result.current.name).toBe("LOBSTR");
  });

  it("requires live reconciliation and rejects a changed account identity", async () => {
    localStorage.setItem("predictify_wallet_state", JSON.stringify({ address: ADDRESS_A, name: "Freighter", connected: true }));
    mockGetAddress.mockResolvedValue({ address: ADDRESS_B });
    const hook = await renderWallet();
    expect(hook.result.current.connected).toBe(false);
    expect(hook.result.current.operationError?.errorKind).toBe("identity_changed");
    expect(localStorage.getItem("predictify_wallet_state")).toBeNull();
  });

  it("permits an explicit new attempt after failure", async () => {
    mockGetAddress.mockRejectedValueOnce(new Error("wallet locked")).mockResolvedValueOnce({ address: ADDRESS_A });
    const hook = await renderWallet();
    await act(async () => { await hook.result.current.connectWallet("freighter"); });
    expect(hook.result.current.operationError?.errorKind).toBe("wallet_locked");
    await act(async () => { await hook.result.current.connectWallet("freighter"); });
    expect(hook.result.current.connected).toBe(true);
    expect(mockGetAddress).toHaveBeenCalledTimes(2);
  });

  it("keeps verified state recoverable when disconnect partially fails", async () => {
    mockGetAddress.mockResolvedValue({ address: ADDRESS_A });
    mockDisconnect.mockRejectedValue(new Error("network offline"));
    const hook = await renderWallet();
    await act(async () => { await hook.result.current.connectWallet("freighter"); });
    let result: unknown;
    await act(async () => { result = await hook.result.current.disconnectWallet(); });

    expect(result).toMatchObject({ success: false, errorKind: "network" });
    expect(hook.result.current.connected).toBe(true);
    expect(hook.result.current.operationStatus).toBe("idle");
  });
});

describe("wallet state validation", () => {
  it("accepts only structurally valid Stellar account IDs", () => {
    expect(walletStateValidation.isValidStellarAddress(ADDRESS_A)).toBe(true);
    expect(walletStateValidation.isValidStellarAddress("G123")).toBe(false);
  });
});
