import { afterEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getPhocoaCache, _injectForTest, _resetForTest } from "./phocoaCache";

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

afterEach(() => _resetForTest());

describe("phocoaCache", () => {
  it("returns empty stale cache before first fetch", () => {
    const { rooms, stale, updatedAt } = getPhocoaCache();
    expect(rooms).toEqual([]);
    expect(stale).toBe(true);
    expect(updatedAt).toBe(0);
  });

  it("returns injected cache immediately with fresh status", () => {
    const sample = [{ table_id: "t1", table_nm: "스피드 bbb 1", shoe: "PBBP", cnt: 4 }];
    _injectForTest(sample, Date.now());
    const { rooms, stale, ageMs } = getPhocoaCache();
    expect(rooms).toEqual(sample);
    expect(stale).toBe(false);
    expect(ageMs).toBeGreaterThanOrEqual(0);
    expect(ageMs).toBeLessThan(1000);
  });

  it("marks cache stale after 30s", () => {
    _injectForTest([{ table_id: "t1", table_nm: "n", shoe: "P", cnt: 1 }], Date.now() - 31_000);
    expect(getPhocoaCache().stale).toBe(true);
  });
});

describe("phocoa tRPC procedures", () => {
  it("getAllRooms returns cached rooms instantly", async () => {
    const sample = [{ table_id: "t2", table_nm: "스피드 bbb 2", shoe: "BB", cnt: 2 }];
    _injectForTest(sample, Date.now());
    const caller = appRouter.createCaller(createCtx());
    const t0 = Date.now();
    const rooms = await caller.phocoa.getAllRooms();
    const elapsed = Date.now() - t0;
    expect(rooms).toEqual(sample);
    expect(elapsed).toBeLessThan(100); // 외부 API 대기 없이 즉시 응답
  });

  it("getStatus reports freshness", async () => {
    _injectForTest([{ table_id: "t", table_nm: "n", shoe: "P", cnt: 1 }], Date.now());
    const caller = appRouter.createCaller(createCtx());
    const status = await caller.phocoa.getStatus();
    expect(status.stale).toBe(false);
    expect(status.updatedAt).toBeGreaterThan(0);
  });
});
