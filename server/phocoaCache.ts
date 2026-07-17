// Phocoa API 캐싱 프록시
// 문제: Phocoa API 응답이 2.3~3.5초(느릴 때 10초+) 걸리는데, 클라이언트가 3초마다
// 직접 호출하면 요청이 겹겹이 쌓여 오래된 응답이 뒤늦게 도착해 결과가 밀리는 현상 발생.
// 해결: 서버가 백그라운드에서 단일 폴링 루프로 데이터를 갱신하고,
// 클라이언트 요청에는 항상 최신 캐시를 즉시(수 ms) 응답한다.

export interface PhocoaRoom {
  table_id: unknown;
  table_nm: unknown;
  shoe: unknown;
  cnt: unknown;
}

const PHOCOA_URL = "https://game.phocoa.com/webhook/api/3matrix4";
const POLL_INTERVAL_MS = 1000; // 폴링 간격 (완료 후 다음 요청까지 대기) - 밀림 최소화를 위해 1초
const FETCH_TIMEOUT_MS = 8000; // 단일 요청 최대 대기
const STALE_THRESHOLD_MS = 30_000; // 이보다 오래된 캐시는 stale로 표시

let cache: PhocoaRoom[] = [];
let lastUpdatedAt = 0; // epoch ms
let lastErrorAt = 0;
let consecutiveErrors = 0;
let pollingStarted = false;
let inFlight = false;
let inFlightSince = 0;

async function fetchOnce(): Promise<void> {
  // 중복 요청 방지 + inFlight 고착 방지 워치독
  if (inFlight) {
    if (Date.now() - inFlightSince < FETCH_TIMEOUT_MS * 2) return;
    console.warn("[PhocoaCache] inFlight watchdog: force-clearing stuck flag");
  }
  inFlight = true;
  inFlightSince = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(PHOCOA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Phocoa API error: ${res.status}`);
    const data = (await res.json()) as PhocoaRoom[];
    if (Array.isArray(data) && data.length > 0) {
      cache = data.map((room) => ({
        table_id: room.table_id,
        table_nm: room.table_nm,
        shoe: room.shoe,
        cnt: room.cnt,
      }));
      lastUpdatedAt = Date.now();
      consecutiveErrors = 0;
    }
  } catch (e) {
    lastErrorAt = Date.now();
    consecutiveErrors++;
    if (consecutiveErrors <= 3 || consecutiveErrors % 20 === 0) {
      console.warn(`[PhocoaCache] fetch failed (x${consecutiveErrors}):`, (e as Error).message);
    }
  } finally {
    clearTimeout(timer);
    inFlight = false;
  }
}

function scheduleNext() {
  // 연속 실패 시 백오프 (최대 15초), 정상 시 2초 간격
  const delay = consecutiveErrors > 0 ? Math.min(15_000, POLL_INTERVAL_MS * (1 + consecutiveErrors)) : POLL_INTERVAL_MS;
  setTimeout(async () => {
    await fetchOnce();
    scheduleNext();
  }, delay);
}

/** 서버 시작 시 1회 호출: 백그라운드 폴링 시작 */
export function startPhocoaPolling(): void {
  if (pollingStarted) return;
  pollingStarted = true;
  void fetchOnce().then(() => scheduleNext());
  console.log("[PhocoaCache] background polling started");
}

/**
 * 요청 시점 보정: 캐시가 오래됐으면 즉시 갱신을 트리거한다.
 * - 캐시가 5초 이상 오래됨 → 백그라운드 갱신 트리거 후 기존 캐시 즉시 반환 (stale-while-revalidate)
 * - 캐시가 비어있거나 20초 이상 오래됨 → 갱신 완료를 기다렸다가 반환
 * Autoscale(서버리스) 환경에서 인스턴스가 재기동되거나 요청 사이 폴링이 멈춰도
 * 항상 신선한 데이터를 보장한다.
 */
export async function ensureFreshPhocoa(): Promise<void> {
  const age = lastUpdatedAt ? Date.now() - lastUpdatedAt : Infinity;
  if (age > 15_000) {
    await fetchOnce();
    const still = lastUpdatedAt ? Date.now() - lastUpdatedAt : Infinity;
    if (still > 15_000 && !inFlight) {
      await fetchOnce();
    }
  } else if (age > 3_000) {
    void fetchOnce();
  }
}

/** 최신 캐시 즉시 반환 (밀리초 단위 응답) */
export function getPhocoaCache(): {
  rooms: PhocoaRoom[];
  updatedAt: number;
  ageMs: number;
  stale: boolean;
} {
  const now = Date.now();
  const ageMs = lastUpdatedAt ? now - lastUpdatedAt : -1;
  return {
    rooms: cache,
    updatedAt: lastUpdatedAt,
    ageMs,
    stale: lastUpdatedAt === 0 || ageMs > STALE_THRESHOLD_MS,
  };
}

/** 테스트용 내부 상태 초기화 */
export function _resetForTest(): void {
  cache = [];
  lastUpdatedAt = 0;
  lastErrorAt = 0;
  consecutiveErrors = 0;
  inFlight = false;
}

/** 테스트용 캐시 주입 */
export function _injectForTest(rooms: PhocoaRoom[], updatedAt: number): void {
  cache = rooms;
  lastUpdatedAt = updatedAt;
}
