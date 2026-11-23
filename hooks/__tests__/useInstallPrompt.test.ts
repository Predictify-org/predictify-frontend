import { renderHook, act } from "@testing-library/react";
import { useInstallPrompt } from "../useInstallPrompt";

function makePromptEvent(outcome: "accepted" | "dismissed") {
  const event = new Event("beforeinstallprompt") as any;
  event.prompt = jest.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  event.preventDefault = jest.fn();
  return event;
}

describe("useInstallPrompt", () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it("canInstall is false before the event fires", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
  });

  it("canInstall becomes true when beforeinstallprompt fires", () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = makePromptEvent("accepted");
    act(() => { window.dispatchEvent(event); });
    expect(result.current.canInstall).toBe(true);
  });

  it("promptInstall returns accepted outcome", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = makePromptEvent("accepted");
    act(() => { window.dispatchEvent(event); });
    let outcome: string = "";
    await act(async () => { outcome = await result.current.promptInstall(); });
    expect(outcome).toBe("accepted");
    expect(result.current.canInstall).toBe(false);
  });

  it("promptInstall returns unavailable when no prompt is queued", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    let outcome: string = "";
    await act(async () => { outcome = await result.current.promptInstall(); });
    expect(outcome).toBe("unavailable");
  });

  it("promptInstall returns dismissed when user dismisses", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = makePromptEvent("dismissed");
    act(() => { window.dispatchEvent(event); });
    let outcome: string = "";
    await act(async () => { outcome = await result.current.promptInstall(); });
    expect(outcome).toBe("dismissed");
  });
});
