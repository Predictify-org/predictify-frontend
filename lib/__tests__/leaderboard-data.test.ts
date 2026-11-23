import {
  CURRENT_USER_INDEX,
  CURRENT_USER_NAME,
  LEADERBOARD_ENTRY_COUNT,
  LEADERBOARD_SEED,
  createLeaderboardData,
  mockLeaderboardData,
  type LeaderboardUser,
} from "../leaderboard-data";

describe("mockLeaderboardData", () => {
  it("contains 100 rank-ordered entries", () => {
    expect(mockLeaderboardData).toHaveLength(LEADERBOARD_ENTRY_COUNT);
    expect(mockLeaderboardData.map((user) => user.rank)).toEqual(
      Array.from({ length: LEADERBOARD_ENTRY_COUNT }, (_, index) => index + 1),
    );
  });

  it("keeps every generated value inside its documented range", () => {
    for (const user of mockLeaderboardData) {
      expect(user.profit).toBeGreaterThanOrEqual(0);
      expect(user.profit).toBeLessThan(500);
      expect(user.winRate).toBeGreaterThanOrEqual(50);
      expect(user.winRate).toBeLessThan(90);
      expect(user.predictions).toBeGreaterThanOrEqual(10);
      expect(user.predictions).toBeLessThan(510);
    }
  });

  it("marks exactly one current user at index 42", () => {
    const currentUsers = mockLeaderboardData.filter((user) => user.isCurrentUser);

    expect(currentUsers).toHaveLength(1);
    expect(currentUsers[0]).toEqual(
      expect.objectContaining({
        rank: CURRENT_USER_INDEX + 1,
        name: CURRENT_USER_NAME,
      }),
    );
    expect(mockLeaderboardData[CURRENT_USER_INDEX].isCurrentUser).toBe(true);
  });

  it("has no avatar URLs, so no third-party requests are made", () => {
    expect(mockLeaderboardData.every((user) => user.avatarUrl === undefined)).toBe(true);
    expect(JSON.stringify(mockLeaderboardData)).not.toMatch(/https?:\/\//);
  });

  it("is identical across evaluations", () => {
    const first = createLeaderboardData();
    const second = createLeaderboardData();

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });

  it("is identical across module reloads", () => {
    let reloaded: LeaderboardUser[] = [];

    jest.isolateModules(() => {
      reloaded = require("../leaderboard-data").mockLeaderboardData;
    });

    expect(reloaded).toEqual(mockLeaderboardData);
  });

  it("changes when the seed changes", () => {
    const reseeded = createLeaderboardData(LEADERBOARD_SEED + 1);

    expect(reseeded).toHaveLength(mockLeaderboardData.length);
    expect(reseeded.map((user) => user.profit)).not.toEqual(
      mockLeaderboardData.map((user) => user.profit),
    );
  });

  it("does not pre-sort by profit; rank order is the array order", () => {
    const profits = mockLeaderboardData.map((user) => user.profit);
    const sorted = [...profits].sort((left, right) => right - left);

    expect(profits).not.toEqual(sorted);
    expect(mockLeaderboardData[0].rank).toBe(1);
    expect(mockLeaderboardData.at(-1)?.rank).toBe(100);
  });
});
