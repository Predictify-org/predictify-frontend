import { getMessages, defaultMessages } from "@/app/i18n";

describe("translation catalog parity", () => {
  const sourceKeys = Object.keys(defaultMessages).sort();

  it.each(["es", "fr"])("%s has the same keys, placeholders, and non-empty values", (locale) => {
    const messages = getMessages(locale);
    const translatedKeys = Object.keys(messages).sort();

    expect(translatedKeys).toEqual(sourceKeys);

    for (const key of sourceKeys) {
      expect(messages[key].trim()).not.toBe("");

      const sourcePlaceholders = defaultMessages[key].match(/\{\w+\}/g) ?? [];
      const translatedPlaceholders = messages[key].match(/\{\w+\}/g) ?? [];
      expect(translatedPlaceholders.sort()).toEqual(sourcePlaceholders.sort());
    }
  });
});
