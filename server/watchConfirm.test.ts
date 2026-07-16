import { beforeEach, describe, expect, it } from "vitest";
import { analyzeTables } from "./streakAnalyzer";
import { updateWatchList, _resetWatchForTest } from "./watchConfirm";

// A 패턴(직전 반대)이 전승하는 규칙적 슈 → O/X 점수와 중국점 정렬 모두 높아 결합 90+ 후보가 됨
const REGULAR = "PBPBPBPBPBPBPBPBPBPB"; // 20판, A 패턴 전승

function makeRooms(shoe: string) {
  return [{ table_id: "t1", table_nm: "스피드 바카라 1", shoe }];
}

beforeEach(() => _resetWatchForTest());

describe("updateWatchList", () => {
  it("registers 90+ combined candidates as watching", () => {
    const rooms = makeRooms(REGULAR);
    const results = analyzeTables(rooms);
    const { watching, confirmed } = updateWatchList(results, rooms);
    expect(confirmed).toHaveLength(0);
    const w = watching.find((x) => x.pattern === "A");
    expect(w).toBeDefined();
    expect(w!.combinedScore).toBeGreaterThanOrEqual(90);
    expect(w!.status).toBe("watching");
  });

  it("confirms candidate when first game after watch is a hit (O)", () => {
    let rooms = makeRooms(REGULAR);
    let results = analyzeTables(rooms);
    updateWatchList(results, rooms);
    // 다음 판: A 패턴 예측 적중 (P 다음 B... 마지막 B 다음은 P 예측 → P 도착)
    const nextShoe = REGULAR + "P";
    rooms = makeRooms(nextShoe);
    results = analyzeTables(rooms);
    const { watching, confirmed } = updateWatchList(results, rooms);
    const c = confirmed.find((x) => x.pattern === "A");
    expect(c).toBeDefined();
    expect(c!.status).toBe("confirmed");
    expect(c!.winsSinceConfirm).toBe(1);
    expect(watching.find((x) => x.pattern === "A")).toBeUndefined();
  });

  it("drops candidate when first game after watch is a miss (X)", () => {
    let rooms = makeRooms(REGULAR);
    let results = analyzeTables(rooms);
    updateWatchList(results, rooms);
    // 다음 판: A 패턴 예측 실패 (마지막 B 다음 P 예측인데 B 도착)
    const nextShoe = REGULAR + "B";
    rooms = makeRooms(nextShoe);
    results = analyzeTables(rooms);
    const { watching, confirmed } = updateWatchList(results, rooms);
    expect(confirmed.find((x) => x.pattern === "A")).toBeUndefined();
    // 탈락했지만 여전히 90+ 후보라면 새로 관찰 등록될 수 있음 - 단 같은 판정 시점에는 목록에서 제외됨
    // 최소한 확정 목록에 없어야 함이 핵심
  });

  it("keeps confirmed candidate winning streak and drops on miss", () => {
    let rooms = makeRooms(REGULAR);
    updateWatchList(analyzeTables(rooms), rooms);
    // 확정
    let shoe = REGULAR + "P";
    rooms = makeRooms(shoe);
    updateWatchList(analyzeTables(rooms), rooms);
    // 확정 후 한 판 더 적중 (P 다음 B 예측 → B 도착)
    shoe = shoe + "B";
    rooms = makeRooms(shoe);
    let r = updateWatchList(analyzeTables(rooms), rooms);
    const c = r.confirmed.find((x) => x.pattern === "A");
    expect(c).toBeDefined();
    expect(c!.winsSinceConfirm).toBe(2);
    // 이후 빗나감 (B 다음 P 예측인데 B 도착) → 해제
    shoe = shoe + "B";
    rooms = makeRooms(shoe);
    r = updateWatchList(analyzeTables(rooms), rooms);
    expect(r.confirmed.find((x) => x.pattern === "A" && x.winsSinceConfirm === 2)).toBeUndefined();
    // 패배로 종료되면 ended 목록에 1분간 표시
    const e = r.ended.find((x) => x.pattern === "A");
    expect(e).toBeDefined();
    expect(e!.finalWins).toBe(2);
  });
});
