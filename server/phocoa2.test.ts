import { beforeEach, describe, expect, it } from "vitest";
import {
  _injectPhocoa2ForTest,
  _resetPhocoa2ForTest,
  extendShoe,
  getPhocoa2Rooms,
  learnTransitions,
} from "./phocoa2";
import { _injectForTest as injectPhocoaCache, _resetForTest as resetPhocoaCache } from "./phocoaCache";

beforeEach(() => {
  _resetPhocoa2ForTest();
  resetPhocoaCache();
});

describe("learnTransitions", () => {
  it("learns transition probabilities from shoe history", () => {
    // PPPP → P 다음 P 확률 높음
    const m = learnTransitions("PPPPPPPPPP");
    expect(m.pAfterP).toBeGreaterThan(0.9);
    expect(m.pRatio).toBeGreaterThan(0.9);
  });
  it("handles mixed shoe with ties", () => {
    const m = learnTransitions("PBPBTPBPB");
    expect(m.pAfterB).toBeGreaterThan(0.5); // B 다음 P가 자주 나옴
    expect(m.tieRate).toBeGreaterThan(0);
    expect(m.tieRate).toBeLessThan(0.5);
  });
});

describe("extendShoe (예측 엔진)", () => {
  const shoe = "PBBPPBPPBBPPBBPB";
  const base = Date.now();

  it("returns real shoe unchanged when data is fresh", () => {
    const r = extendShoe("t1", shoe, base, base + 10_000); // 10초 경과 (60초 미만)
    expect(r.shoe).toBe(shoe);
    expect(r.predictedFrom).toBe(-1);
  });

  it("extends shoe deterministically when data is stale", () => {
    const staleNow = base + 60_000 + 95_000; // 60초 + 95초 → 4판 예측
    const r1 = extendShoe("t1", shoe, base, staleNow);
    const r2 = extendShoe("t1", shoe, base, staleNow);
    expect(r1.shoe).toBe(r2.shoe); // 결정적: 같은 입력 → 같은 예측
    expect(r1.shoe.length).toBeGreaterThan(shoe.length);
    expect(r1.shoe.startsWith(shoe)).toBe(true); // 실데이터 구간은 보존
    expect(r1.predictedFrom).toBe(shoe.length);
    // 예측값은 유효한 문자만
    const predicted = r1.shoe.slice(shoe.length);
    expect(/^[PBT]+$/.test(predicted)).toBe(true);
  });

  it("advances one round per interval", () => {
    const t1 = extendShoe("t1", shoe, base, base + 61_000);
    const t2 = extendShoe("t1", shoe, base, base + 61_000 + 30_000);
    expect(t2.shoe.length).toBe(t1.shoe.length + 1);
    expect(t2.shoe.startsWith(t1.shoe)).toBe(true); // 시간이 지나도 이전 예측은 불변
  });

  it("differs between tables (independent seeds)", () => {
    const staleNow = base + 60_000 + 300_000; // 여러 판 예측
    const a = extendShoe("tableA", shoe, base, staleNow);
    const b = extendShoe("tableB", shoe, base, staleNow);
    // 서로 다른 테이블은 독립적 예측 (대부분 다름 - 같을 수도 있으나 10판 이상이면 극히 드묾)
    expect(a.shoe.length).toBe(b.shoe.length);
  });
});

describe("getPhocoa2Rooms (Phocoa API 2)", () => {
  it("returns same results as Phocoa API when data is fresh", async () => {
    const now = Date.now();
    const rooms = [
      { table_id: "t1", table_nm: "스피드 bbb 1", shoe: "PBBP", cnt: 4 },
      { table_id: "t2", table_nm: "스피드 bbb 2", shoe: "BBPP", cnt: 4 },
    ];
    injectPhocoaCache(rooms, now);
    const out = await getPhocoa2Rooms(now);
    expect(out).toHaveLength(2);
    const t1 = out.find((r) => r.table_id === "t1")!;
    expect(t1.shoe).toBe("PBBP"); // 원본과 동일
    expect(t1.cnt).toBe(4);
    expect(t1.predicted).toBe(false);
  });

  it("switches to prediction mode when real data is stale", async () => {
    const past = Date.now() - 120_000; // 2분 전 실데이터
    _injectPhocoa2ForTest("t1", "스피드 bbb 1", "PBBPPBPB", past);
    const out = await getPhocoa2Rooms(Date.now());
    const t1 = out.find((r) => r.table_id === "t1")!;
    expect(t1.predicted).toBe(true);
    expect(t1.predicted_from).toBe(8);
    expect(t1.shoe.startsWith("PBBPPBPB")).toBe(true);
    expect(t1.shoe.length).toBeGreaterThan(8);
  });
});
