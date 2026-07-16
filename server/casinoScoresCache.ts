// CasinoScores API 캐싱 프록시
// Phocoa와 동일한 구조: 서버가 테이블별로 백그라운드 폴링하여 캐시를 유지하고,
// 클라이언트 요청에는 최신 캐시를 즉시 응답한다.

export interface CasinoScoresResult {
  outcome: string | undefined;
  settledAt: string | undefined;
}

export interface CasinoScoresSnapshot {
  results: CasinoScoresResult[];
  total: number;
  source: string;
  tableName: string;
}

const TABLES = ["lightningbaccarat", "speedbaccarata"] as const;
const POLL_INTERVAL_MS = 2500;
const FETCH_TIMEOUT_MS = 10_000;
const STALE_THRESHOLD_MS = 60_000;
const HEADERS = {
  Origin: "https://www.casino.org",
  Referer: "https://www.casino.org/casinoscores/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
};

interface TableCache {
  snapshot: CasinoScoresSnapshot | null;
  updatedAt: number;
  consecutiveErrors: number;
  inFlight: boolean;
  inFlightSince: number;
  lastAttemptAt: number;
  lastError: string;
  lastErrorAt: number;
}

const caches = new Map<string, TableCache>();
let pollingStarted = false;

function getTableCache(table: string): TableCache {
  let c = caches.get(table);
  if (!c) {
    c = { snapshot: null, updatedAt: 0, consecutiveErrors: 0, inFlight: false, inFlightSince: 0, lastAttemptAt: 0, lastError: "", lastErrorAt: 0 };
    caches.set(table, c);
  }
  return c;
}

async function fetchTable(table: string): Promise<void> {
  const c = getTableCache(table);
  // inFlight 고착 방지: 타임아웃(10초)의 2배가 지나도 inFlight가 풀리지 않으면
  // (abort 실패, 프로세스 일시정지 등) 강제로 해제하고 재시도한다.
  if (c.inFlight) {
    if (Date.now() - c.inFlightSince < FETCH_TIMEOUT_MS * 2) return;
    console.warn(`[CasinoScoresCache] ${table} inFlight watchdog: force-clearing stuck flag`);
    c.inFlight = false;
  }
  c.inFlight = true;
  c.inFlightSince = Date.now();
  c.lastAttemptAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `https://api-cs.casino.org/svc-evolution-game-events/api/${table}?page=0&size=200&sort=data.settledAt,desc&duration=6&outcomes=Player,Banker,Tie`;
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`CasinoScores API error: ${res.status}`);
    const data = (await res.json()) as Array<{
      data?: { result?: { outcome?: string }; settledAt?: string; table?: { name?: string } };
    }>;
    const results = data
      .filter((item) => item?.data?.result?.outcome)
      .reverse()
      .map((item) => ({ outcome: item.data!.result!.outcome, settledAt: item.data!.settledAt }));
    const tableName = data[0]?.data?.table?.name || table;
    c.snapshot = {
      results,
      total: data.length,
      source: "casinoscores",
      tableName: tableName + " (Evolution Live)",
    };
    c.updatedAt = Date.now();
    c.consecutiveErrors = 0;
  } catch (e) {
    c.consecutiveErrors++;
    const err = e as Error & { cause?: unknown };
    c.lastError = `${err.name}: ${err.message}${err.cause ? ` (cause: ${String(err.cause)})` : ""}`;
    c.lastErrorAt = Date.now();
    if (c.consecutiveErrors <= 3 || c.consecutiveErrors % 20 === 0) {
      console.warn(`[CasinoScoresCache] ${table} fetch failed (x${c.consecutiveErrors}):`, c.lastError);
    }
  } finally {
    clearTimeout(timer);
    c.inFlight = false;
  }
}

function scheduleTable(table: string) {
  const c = getTableCache(table);
  const delay = c.consecutiveErrors > 0 ? Math.min(20_000, POLL_INTERVAL_MS * (1 + c.consecutiveErrors)) : POLL_INTERVAL_MS;
  setTimeout(async () => {
    await fetchTable(table);
    scheduleTable(table);
  }, delay);
}

export function startCasinoScoresPolling(): void {
  if (pollingStarted) return;
  pollingStarted = true;
  for (const t of TABLES) {
    void fetchTable(t).then(() => scheduleTable(t));
  }
  // 글로벌 워치독: 폴링 체인이 어떤 이유로든 끊겨 30초 이상 시도조차 없으면 재시동
  setInterval(() => {
    const now = Date.now();
    for (const t of TABLES) {
      const c = getTableCache(t);
      if (now - c.lastAttemptAt > 30_000) {
        console.warn(`[CasinoScoresCache] ${t} poll watchdog: no attempt for 30s, refetching`);
        void fetchTable(t);
      }
    }
  }, 15_000);
  console.log("[CasinoScoresCache] background polling started");
}

/** 요청 시점 보정: 캐시가 오래됐으면 즉시 갱신 (stale-while-revalidate) */
export async function ensureFreshCasinoScores(table: string): Promise<void> {
  const c = getTableCache(table);
  const age = c.updatedAt ? Date.now() - c.updatedAt : Infinity;
  if (age > 30_000) {
    await fetchTable(table);
    // fetch가 inFlight에 막혀 스킵되었는데 여전히 오래된 경우, 워치독 경과 후 1회 재시도
    const still = c.updatedAt ? Date.now() - c.updatedAt : Infinity;
    if (still > 30_000 && !c.inFlight) {
      await fetchTable(table);
    }
  } else if (age > 5_000) {
    void fetchTable(table);
  }
}

/** 캐시가 있으면 즉시 반환, 없으면(서버 기동 직후 등) 직접 1회 fetch 후 반환 */
export async function getCasinoScoresSnapshot(table: string): Promise<{
  snapshot: CasinoScoresSnapshot | null;
  updatedAt: number;
  ageMs: number;
  stale: boolean;
  consecutiveErrors?: number;
  lastError?: string;
  lastAttemptAt?: number;
}> {
  const c = getTableCache(table);
  if (!c.snapshot && !c.inFlight) {
    await fetchTable(table);
  }
  const now = Date.now();
  const ageMs = c.updatedAt ? now - c.updatedAt : -1;
  return {
    snapshot: c.snapshot,
    updatedAt: c.updatedAt,
    ageMs,
    stale: c.updatedAt === 0 || ageMs > STALE_THRESHOLD_MS,
    consecutiveErrors: c.consecutiveErrors,
    lastError: c.lastError,
    lastAttemptAt: c.lastAttemptAt,
  };
}

export function _resetForTest(): void {
  caches.clear();
}

export function _injectForTest(table: string, snapshot: CasinoScoresSnapshot, updatedAt: number): void {
  const c = getTableCache(table);
  c.snapshot = snapshot;
  c.updatedAt = updatedAt;
}
