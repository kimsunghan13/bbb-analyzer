import { describe, expect, it } from "vitest";
import {
  analyzeStreaks,
  analyzeTables,
  buildHitHistory,
  scoreStreakPotential,
  topStreakCandidates,
} from "./streakAnalyzer";
import { getTokenUsername, createSessionToken } from "./analyzerAuth";

describe("buildHitHistory", () => {
  it("builds O/X history for pattern B (follow last)", () => {
    // PPPP: B 패턴(직전 동일 예측)은 모두 적중
    const hits = buildHitHistory("B", "PPPPP");
    expect(hits.every(Boolean)).toBe(true);
    expect(hits.length).toBe(4);
  });
  it("builds O/X history for pattern A (opposite)", () => {
    // PBPBP: A 패턴(직전 반대 예측)은 모두 적중
    const hits = buildHitHistory("A", "PBPBP");
    expect(hits.every(Boolean)).toBe(true);
  });
  it("ignores ties in shoe", () => {
    const hits = buildHitHistory("B", "PTPTP");
    expect(hits.length).toBe(2); // P,P,P만 유효 → 2회 예측
    expect(hits.every(Boolean)).toBe(true);
  });
});

describe("analyzeStreaks", () => {
  it("computes current streak from tail", () => {
    const s = analyzeStreaks([false, true, true, true]);
    expect(s.currentStreak).toBe(3);
  });
  it("computes streak frequency (3+ streak ratio)", () => {
    // 연승 구간: [3], [1] → 3연승 이상 1/2 = 50%
    const s = analyzeStreaks([true, true, true, false, true, false]);
    expect(s.streakFrequency).toBe(0.5);
  });
  it("handles all-miss history", () => {
    const s = analyzeStreaks([false, false, false]);
    expect(s.currentStreak).toBe(0);
    expect(s.avgStreakLength).toBe(0);
  });
});

describe("scoreStreakPotential", () => {
  it("scores higher for strong momentum and active streak", () => {
    const strong = scoreStreakPotential({ currentStreak: 2, recentHitRate: 0.9, streakFrequency: 0.6, avgStreakLength: 2.8 });
    const weak = scoreStreakPotential({ currentStreak: 0, recentHitRate: 0.2, streakFrequency: 0.1, avgStreakLength: 1.0 });
    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThanOrEqual(65);
    expect(weak).toBeLessThan(40);
  });
});

describe("analyzeTables + topStreakCandidates", () => {
  it("skips tables with short shoes and returns scored candidates", () => {
    const rooms = [
      { table_id: "t1", table_nm: "스피드 바카라 1", shoe: "PBP" }, // 너무 짧음 → 제외
      { table_id: "t2", table_nm: "스피드 바카라 2", shoe: "PBPBPBPBPBPBPBPBPBPB" }, // A 패턴 전승
    ];
    const results = analyzeTables(rooms);
    expect(results.find((r) => r.tableId === "t1")).toBeUndefined();
    const t2 = results.find((r) => r.tableId === "t2");
    expect(t2).toBeDefined();
    const patternA = t2!.patterns.find((p) => p.pattern === "A");
    expect(patternA).toBeDefined();
    expect(patternA!.score).toBeGreaterThanOrEqual(65);
    const top = topStreakCandidates(results, 65, 5);
    expect(top.length).toBeGreaterThan(0);
    expect(top[0].tableNm).toBe("스피드 바카라 2");
  });
});

describe("qqq-only access (getTokenUsername)", () => {
  it("extracts username from valid token", () => {
    expect(getTokenUsername(createSessionToken("qqq"))).toBe("qqq");
    expect(getTokenUsername(createSessionToken("aaa"))).toBe("aaa");
  });
  it("returns null for invalid token", () => {
    expect(getTokenUsername("bad.token")).toBe(null);
    expect(getTokenUsername(undefined)).toBe(null);
  });
});
