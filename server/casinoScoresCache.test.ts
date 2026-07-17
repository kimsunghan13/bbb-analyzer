import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  _injectForTest,
  _resetForTest,
  ensureFreshCasinoScores,
  getCasinoScoresSnapshot,
} from "./casinoScoresCache";

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const sampleSnapshot = {
  results: [{ outcome: "Player", settledAt: "2026-07-15T00:00:00Z" }],
  total: 1,
  source: "casinoscores",
  tableName: "Lightning Baccarat (Evolution Live)",
};

afterEach(() => _resetForTest());

describe("casinoScoresCache", () => {
  it("returns injected snapshot immediately with fresh status", async () => {
    _injectForTest("lightningbaccarat", sampleSnapshot, Date.now());
    const t0 = Date.now();
    const { snapshot, stale } = await getCasinoScoresSnapshot("lightningbaccarat");
    expect(Date.now() - t0).toBeLessThan(100);
    expect(snapshot).toEqual(sampleSnapshot);
    expect(stale).toBe(false);
  });

  it("marks cache stale after 60s", async () => {
    _injectForTest("lightningbaccarat", sampleSnapshot, Date.now() - 61_000);
    const { stale } = await getCasinoScoresSnapshot("lightningbaccarat");
    expect(stale).toBe(true);
  });
});

describe("baccarat tRPC procedures with cache", () => {
  it("getResults returns cached snapshot instantly", async () => {
    _injectForTest("lightningbaccarat", sampleSnapshot, Date.now());
    const caller = appRouter.createCaller(createCtx());
    const t0 = Date.now();
    const out = await caller.baccarat.getResults({ table: "lightningbaccarat", size: 200, duration: 6 });
    expect(Date.now() - t0).toBeLessThan(100);
    expect(out.tableName).toBe(sampleSnapshot.tableName);
    expect(out.results).toHaveLength(1);
  });

  it("getStatus reports freshness", async () => {
    _injectForTest("lightningbaccarat", sampleSnapshot, Date.now());
    const caller = appRouter.createCaller(createCtx());
    const status = await caller.baccarat.getStatus({ table: "lightningbaccarat" });
    expect(status.stale).toBe(false);
    expect(status.updatedAt).toBeGreaterThan(0);
  });
});

describe("casinoScoresCache watchdog / ensureFresh", () => {
  it("ensureFresh refetches when cache is older than 30s", async () => {
    // 오래된 캐시 주입 후 fetch를 성공 응답으로 목킹
    _injectForTest("lightningbaccarat", sampleSnapshot, Date.now() - 60_000);
    const mockData = [
      {
        data: {
          result: { outcome: "Banker" },
          settledAt: new Date().toISOString(),
          table: { name: "Lightning Baccarat" },
        },
      },
    ];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    try {
      await ensureFreshCasinoScores("lightningbaccarat");
      expect(fetchSpy).toHaveBeenCalled();
      const { stale, snapshot } = await getCasinoScoresSnapshot("lightningbaccarat");
      expect(stale).toBe(false);
      expect(snapshot?.results[0]?.outcome).toBe("Banker");
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("ensureFresh does not block when cache is fresh", async () => {
    _injectForTest("lightningbaccarat", sampleSnapshot, Date.now());
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      await ensureFreshCasinoScores("lightningbaccarat");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("recovers from a failing fetch and refreshes on next ensureFresh", async () => {
    _injectForTest("lightningbaccarat", sampleSnapshot, Date.now() - 60_000);
    // 1차: fetch 실패
    const failSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    await ensureFreshCasinoScores("lightningbaccarat");
    let status = await getCasinoScoresSnapshot("lightningbaccarat");
    expect(status.stale).toBe(true); // 실패했으므로 여전히 stale
    failSpy.mockRestore();
    // 2차: fetch 복구 → ensureFresh가 다시 시도하여 fresh 전환
    const okData = [
      {
        data: {
          result: { outcome: "Player" },
          settledAt: new Date().toISOString(),
          table: { name: "Lightning Baccarat" },
        },
      },
    ];
    const okSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(okData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    try {
      await ensureFreshCasinoScores("lightningbaccarat");
      status = await getCasinoScoresSnapshot("lightningbaccarat");
      expect(status.stale).toBe(false);
    } finally {
      okSpy.mockRestore();
    }
  });
});
