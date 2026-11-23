import { renderHook } from "@testing-library/react";
import { useHideBalancesShortcut } from "@/hooks/useHideBalancesShortcut";
import { usePrivacy } from "@/context/PrivacyContext";

jest.mock("@/context/PrivacyContext", () => ({
  usePrivacy: jest.fn(),
}));

const mockUsePrivacy = usePrivacy as jest.MockedFunction<typeof usePrivacy>;
const setHideBalances = jest.fn();

function mockPrivacy(hideBalances: boolean) {
  mockUsePrivacy.mockReturnValue({ hideBalances, setHideBalances });
}

function setPlatform(platform: string) {
  Object.defineProperty(navigator, "platform", {
    value: platform,
    configurable: true,
  });
}

function press(
  init: KeyboardEventInit,
  target: EventTarget = window,
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

const MAC_COMBO = { key: "b", metaKey: true, shiftKey: true };
const WIN_COMBO = { key: "b", ctrlKey: true, shiftKey: true };

describe("useHideBalancesShortcut", () => {
  beforeEach(() => {
    setHideBalances.mockReset();
    mockPrivacy(false);
    setPlatform("MacIntel");
  });

  afterEach(() => {
    delete (navigator as { platform?: string }).platform;
    document.body.innerHTML = "";
  });

  it("toggles with meta+shift+b on Mac", () => {
    renderHook(() => useHideBalancesShortcut());

    const event = press(MAC_COMBO);

    expect(setHideBalances).toHaveBeenCalledWith(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it.each(["Win32", "Linux x86_64"])("toggles with ctrl+shift+b on %s", (platform) => {
    setPlatform(platform);
    renderHook(() => useHideBalancesShortcut());

    const event = press(WIN_COMBO);

    expect(setHideBalances).toHaveBeenCalledWith(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it("accepts an uppercase B", () => {
    renderHook(() => useHideBalancesShortcut());

    press({ ...MAC_COMBO, key: "B" });

    expect(setHideBalances).toHaveBeenCalledWith(true);
  });

  it("turns balances back on when they are hidden", () => {
    mockPrivacy(true);
    renderHook(() => useHideBalancesShortcut());

    press(MAC_COMBO);

    expect(setHideBalances).toHaveBeenCalledWith(false);
  });

  it.each([
    ["ctrl on Mac", "MacIntel", WIN_COMBO],
    ["meta on Windows", "Win32", MAC_COMBO],
    ["missing shift", "MacIntel", { key: "b", metaKey: true }],
    ["missing modifier", "MacIntel", { key: "b", shiftKey: true }],
    ["another key", "MacIntel", { ...MAC_COMBO, key: "n" }],
  ])("ignores %s without preventing default", (_label, platform, init) => {
    setPlatform(platform);
    renderHook(() => useHideBalancesShortcut());

    const event = press(init);

    expect(setHideBalances).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it.each([
    ["input", "<input />"],
    ["textarea", "<textarea></textarea>"],
    ["select", "<select><option>a</option></select>"],
    ["contenteditable", '<div contenteditable="true"><span>text</span></div>'],
  ])("ignores the shortcut while typing in a %s", (_label, html) => {
    document.body.innerHTML = html;
    const target = document.body.querySelector("span") ?? document.body.firstElementChild!;
    renderHook(() => useHideBalancesShortcut());

    const event = press(MAC_COMBO, target);

    expect(setHideBalances).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("still toggles when focus is on a non-editable element", () => {
    document.body.innerHTML = '<button type="button">Menu</button>';
    renderHook(() => useHideBalancesShortcut());

    press(MAC_COMBO, document.body.querySelector("button")!);

    expect(setHideBalances).toHaveBeenCalledWith(true);
  });

  it("uses the latest hideBalances value after a rerender", () => {
    const { rerender } = renderHook(() => useHideBalancesShortcut());

    mockPrivacy(true);
    rerender();
    press(MAC_COMBO);

    expect(setHideBalances).toHaveBeenCalledTimes(1);
    expect(setHideBalances).toHaveBeenCalledWith(false);
  });

  it("removes its keydown listener on unmount", () => {
    const addSpy = jest.spyOn(window, "addEventListener");
    const removeSpy = jest.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useHideBalancesShortcut());
    const handler = addSpy.mock.calls.find(([type]) => type === "keydown")?.[1];

    unmount();
    unmount();
    press(MAC_COMBO);

    expect(removeSpy).toHaveBeenCalledWith("keydown", handler);
    expect(setHideBalances).not.toHaveBeenCalled();
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("replaces the listener on rerender instead of stacking handlers", () => {
    const { rerender } = renderHook(() => useHideBalancesShortcut());
    mockPrivacy(true);
    rerender();
    mockPrivacy(false);
    rerender();

    press(MAC_COMBO);

    expect(setHideBalances).toHaveBeenCalledTimes(1);
  });
});
