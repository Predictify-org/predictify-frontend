import {
  MARKET_DRAFT_LIMITS,
  canonicalizeMarketDraft,
  validateMarketDraft,
  type MarketDraft,
  type ValidatedMarketDraft,
} from "../market-creation";

const NOW = new Date("2026-06-01T12:00:00.000Z");

function makeDraft(overrides: Partial<MarketDraft> = {}): MarketDraft {
  return {
    title: "Will Argentina win the 2026 World Cup?",
    description: "Resolves YES if Argentina wins the 2026 FIFA World Cup.",
    category: "Sports",
    deadline: new Date("2026-07-01T00:00:00.000Z"),
    options: [{ text: "Yes" }, { text: "No" }],
    isPublic: true,
    featuredEvent: false,
    ...overrides,
  };
}

function validate(overrides: Partial<MarketDraft> = {}) {
  return validateMarketDraft(makeDraft(overrides), { now: NOW });
}

describe("validateMarketDraft", () => {
  it("accepts a valid draft and trims whitespace", () => {
    const result = validate({
      title: "  Will Argentina win the 2026 World Cup?  ",
      description: "  Resolves YES if Argentina wins the 2026 FIFA World Cup.  ",
      options: [{ text: "  Yes " }, { text: "No  " }],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.errors).toEqual({});
    expect(result.data.title).toBe("Will Argentina win the 2026 World Cup?");
    expect(result.data.description).toBe(
      "Resolves YES if Argentina wins the 2026 FIFA World Cup.",
    );
    expect(result.data.outcomes.map((outcome) => outcome.text)).toEqual([
      "Yes",
      "No",
    ]);
  });

  it("rejects empty and too-short titles", () => {
    expect(validate({ title: "   " }).errors.title).toBe("Enter a title");
    expect(validate({ title: "abc" }).errors.title).toBe(
      `Title must be at least ${MARKET_DRAFT_LIMITS.titleMin} characters`,
    );
  });

  it("rejects titles longer than the limit", () => {
    const result = validate({ title: "a".repeat(MARKET_DRAFT_LIMITS.titleMax + 1) });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.title).toContain(`${MARKET_DRAFT_LIMITS.titleMax} characters or fewer`);
  });

  it("rejects empty and too-short descriptions", () => {
    expect(validate({ description: "" }).errors.description).toBe("Enter a description");
    expect(validate({ description: "too short" }).errors.description).toBe(
      `Description must be at least ${MARKET_DRAFT_LIMITS.descriptionMin} characters`,
    );
  });

  it("rejects a missing or unknown category", () => {
    expect(validate({ category: null }).errors.category).toBe("Choose a category");
    expect(validate({ category: "Weather" }).errors.category).toBe("Choose a category");
  });

  it("rejects missing, invalid, past and exactly-now deadlines", () => {
    expect(validate({ deadline: null }).errors.deadline).toBe("Choose a deadline");
    expect(validate({ deadline: "not-a-date" }).errors.deadline).toBe("Choose a deadline");
    expect(
      validate({ deadline: new Date("2026-05-01T00:00:00.000Z") }).errors.deadline,
    ).toBe("Deadline must be in the future");
    expect(validate({ deadline: new Date(NOW) }).errors.deadline).toBe(
      "Deadline must be in the future",
    );
  });

  it("rejects deadlines beyond the maximum horizon", () => {
    const result = validate({ deadline: new Date("2027-06-02T00:00:00.000Z") });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.deadline).toBe(
      `Deadline must be within ${MARKET_DRAFT_LIMITS.maxHorizonDays} days`,
    );
  });

  it("requires at least two outcomes", () => {
    const result = validate({ options: [{ text: "Yes" }] });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.options).toBe(
      `Add at least ${MARKET_DRAFT_LIMITS.outcomeMin} outcomes`,
    );
  });

  it("rejects more than the maximum number of outcomes", () => {
    const options = Array.from(
      { length: MARKET_DRAFT_LIMITS.outcomeMax + 1 },
      (_, index) => ({ text: `Outcome ${index + 1}` }),
    );
    const result = validate({ options });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.options).toBe(
      `Add ${MARKET_DRAFT_LIMITS.outcomeMax} outcomes or fewer`,
    );
  });

  it("rejects whitespace-only outcomes", () => {
    const result = validate({ options: [{ text: "Yes" }, { text: "   " }] });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.options).toBe("Outcome 2 cannot be empty");
  });

  it("rejects duplicate outcomes case-insensitively", () => {
    const result = validate({ options: [{ text: "Yes" }, { text: " yes " }] });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.options).toBe("Outcome “yes” duplicates outcome 1");
  });

  it("validates optional probabilities", () => {
    const result = validate({
      options: [
        { text: "Yes", probability: "60" },
        { text: "No", probability: "  " },
      ],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.outcomes[0].probability).toBe(60);
    expect(result.data.outcomes[1].probability).toBeUndefined();

    expect(
      validate({
        options: [
          { text: "Yes", probability: "abc" },
          { text: "No" },
        ],
      }).errors.options,
    ).toBe("Outcome 1 has an invalid probability");

    expect(
      validate({
        options: [
          { text: "Yes", probability: 120 },
          { text: "No" },
        ],
      }).errors.options,
    ).toBe("Outcome 1 probability must be between 0 and 100");
  });
});

describe("canonicalizeMarketDraft", () => {
  const validated: ValidatedMarketDraft = {
    title: "Will Argentina win the 2026 World Cup?",
    description: "Resolves YES if Argentina wins the 2026 FIFA World Cup.",
    category: "Sports",
    deadline: new Date("2026-07-01T00:00:00.500Z"),
    outcomes: [
      { text: "Yes", probability: 60 },
      { text: "No", probability: 40 },
    ],
    isPublic: true,
    featuredEvent: false,
  };

  it("is stable regardless of display-only probabilities", () => {
    const withOtherProbabilities: ValidatedMarketDraft = {
      ...validated,
      outcomes: [
        { text: "Yes", probability: 99 },
        { text: "No", probability: 1 },
      ],
    };

    expect(canonicalizeMarketDraft(validated)).toBe(
      canonicalizeMarketDraft(withOtherProbabilities),
    );
  });

  it("normalizes the deadline to whole seconds", () => {
    const laterInSameSecond: ValidatedMarketDraft = {
      ...validated,
      deadline: new Date("2026-07-01T00:00:00.900Z"),
    };

    expect(canonicalizeMarketDraft(validated)).toBe(
      canonicalizeMarketDraft(laterInSameSecond),
    );
  });
});
