import { getShortcut, SHORTCUTS, type ShortcutKey } from "@/lib/shortcuts";

const keys = Object.keys(SHORTCUTS) as ShortcutKey[];

function combo(parts: string[]) {
  return [...parts].sort().join("+");
}

describe("SHORTCUTS", () => {
  it("defines the expected shortcut keys", () => {
    expect(keys.sort()).toEqual(
      ["confirmBet", "goToAnalytics", "newEvent", "placeBet", "search", "shareMarket"].sort(),
    );
  });

  it.each(keys)("%s has non-empty mac and win key arrays", (key) => {
    const { mac, win } = SHORTCUTS[key];
    expect(Array.isArray(mac)).toBe(true);
    expect(Array.isArray(win)).toBe(true);
    expect(mac.length).toBeGreaterThan(0);
    expect(win.length).toBeGreaterThan(0);
  });

  it.each(keys)("%s key name matches its record key and has a label", (key) => {
    expect(SHORTCUTS[key].key).toBe(key);
    expect(SHORTCUTS[key].label.trim()).not.toBe("");
  });

  it.each(keys)("%s uses meta only on mac and ctrl only on win", (key) => {
    const { mac, win } = SHORTCUTS[key];
    expect(mac).not.toContain("ctrl");
    expect(win).not.toContain("meta");
  });

  it.each(["mac", "win"] as const)("no two shortcuts share the same %s combo", (platform) => {
    const combos = keys.map((key) => combo(SHORTCUTS[key][platform]));
    expect(new Set(combos).size).toBe(combos.length);
  });
});

describe("getShortcut", () => {
  it.each(keys)("returns the definition for %s", (key) => {
    expect(getShortcut(key)).toBe(SHORTCUTS[key]);
  });

  it("returns undefined for an unknown key", () => {
    expect(getShortcut("unknown" as ShortcutKey)).toBeUndefined();
  });
});
