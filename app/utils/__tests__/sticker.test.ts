import { getThemedSticker } from "../sticker";

describe("getThemedSticker", () => {
  it("should return a stable sticker for a given seed", () => {
    const seed1 = "Alice";
    const seed2 = "Bob";

    const sticker1a = getThemedSticker(seed1);
    const sticker1b = getThemedSticker(seed1);
    const sticker2 = getThemedSticker(seed2);

    // It should be deterministic
    expect(sticker1a).toEqual(sticker1b);

    // It should return different stickers for different seeds (usually)
    // There is a chance of collision, but Alice and Bob yield different hashes with this algorithm.
    expect(sticker1a).not.toEqual(sticker2);
  });

  it("should return a fallback sticker for an empty seed", () => {
    const sticker = getThemedSticker("");
    expect(sticker.initial).toBe("?");
    expect(sticker.emoji).toBeDefined();
    expect(sticker.backgroundClass).toBeDefined();
  });

  it("should correctly set the initial to the first character uppercase", () => {
    const sticker = getThemedSticker("charlie");
    expect(sticker.initial).toBe("C");
  });
});
