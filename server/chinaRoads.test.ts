import { describe, expect, it } from "vitest";
import { analyzeChinaRoads, buildBigRoad, deriveRoad } from "./chinaRoads";
import { analyzeTables, selectPrimeCandidate } from "./streakAnalyzer";

describe("buildBigRoad", () => {
  it("groups consecutive results into columns", () => {
    const cols = buildBigRoad("PPBBBP");
    expect(cols).toEqual([["P", "P"], ["B", "B", "B"], ["P"]]);
  });
  it("ignores ties", () => {
    const cols = buildBigRoad("PTPB");
    expect(cols).toEqual([["P", "P"], ["B"]]);
  });
});

describe("deriveRoad", () => {
  it("produces R for regular alternating pattern", () => {
    // PBPBPBPB: 모든 컬럼 길이 1 → 대안로는 전부 R (규칙적)
    const big = buildBigRoad("PBPBPBPB");
    const road = deriveRoad(big, 1);
    expect(road.length).toBeGreaterThan(0);
    expect(road.every((c) => c === "R")).toBe(true);
  });
  it("produces mixed for irregular pattern", () => {
    const big = buildBigRoad("PPBPBBBPPPBPBB");
    const road = deriveRoad(big, 1);
    expect(road.some((c) => c === "B")).toBe(true);
  });
});

describe("analyzeChinaRoads", () => {
  it("gives high alignment for perfectly regular shoe", () => {
    const a = analyzeChinaRoads("PBPBPBPBPBPBPBPBPBPB");
    expect(a.alignmentScore).toBeGreaterThanOrEqual(80);
  });
  it("returns all three roads", () => {
    const a = analyzeChinaRoads("PPBBPPBBPPBBPPBB");
    expect(a.bigEye.length).toBeGreaterThan(0);
    expect(a.small.length).toBeGreaterThan(0);
    expect(a.cockroach.length).toBeGreaterThan(0);
  });
});

describe("selectPrimeCandidate", () => {
  it("selects the highest combined score pattern", () => {
    const rooms = [
      { table_id: "t1", table_nm: "스피드 바카라 1", shoe: "PBPBPBPBPBPBPBPBPBPB" }, // A 패턴 전승 + 정렬 높음
      { table_id: "t2", table_nm: "스피드 바카라 2", shoe: "PPBBPBBPPBPBBPPB" },
    ];
    const results = analyzeTables(rooms);
    const prime = selectPrimeCandidate(results, 60);
    expect(prime).not.toBeNull();
    expect(prime!.tableNm).toBe("스피드 바카라 1");
    expect(prime!.pattern).toBe("A");
    expect(prime!.combinedScore).toBeGreaterThanOrEqual(80);
    expect(prime!.roadAlignment).toBeGreaterThanOrEqual(80);
  });
  it("returns null when no pattern meets minimum", () => {
    const rooms = [{ table_id: "t1", table_nm: "t", shoe: "PPBBPPBB" }]; // 짧아서 제외될 수 있음
    const results = analyzeTables(rooms, 100); // 최소 길이를 높여 강제 제외
    expect(selectPrimeCandidate(results)).toBeNull();
  });
});

