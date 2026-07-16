// Phocoa API 2: 메모리 기반 독립 API (DB 저장 제거)
// - Phocoa 정상 시: 실데이터를 메모리에 유지하고 그대로 제공 (원본과 동일한 결과 보장)
// - Phocoa 장애 시: 마지막 실데이터에 예측 엔진으로 결과를 이어감 (predicted: true 표시)
//
// 예측 엔진 원리 (마르코프 체인 + 패턴 가중):
//  과거 슈 데이터에서 직전 결과 전이 확률(P→P, P→B, B→P, B→B)과
//  최근 연속(streak) 경향을 학습해 다음 결과를 결정적(seed 기반)으로 생성한다.
//  같은 시점에 여러 클라이언트가 조회해도 동일한 예측값이 나오도록
//  시간 슬롯 기반의 결정적 시드를 사용한다.

import { getPhocoaCache, type PhocoaRoom } from "./phocoaCache";

const REAL_STALE_LIMIT_MS = 60_000; // 실데이터가 60초 이상 없으면 예측 모드로 전환
const PREDICT_ROUND_MS = 30_000; // 예측 모드에서 30초마다 한 판씩 진행 (실제 게임 속도 근사)
const MAX_SHOE_LEN = 120; // 예측으로 이어갈 최대 슈 길이 (실제 슈 한계 근사)

interface Phocoa2Room {
  table_id: unknown;
  table_nm: unknown;
  shoe: string;
  cnt: number;
  predicted: boolean; // 이 테이블의 최근 결과에 예측값이 포함되는지
  predicted_from: number; // 예측 시작 인덱스 (실데이터 길이), 예측 없으면 -1
}

// 메모리 상태: 마지막 실데이터
interface TableState {
  tableId: string;
  tableNm: string;
  realShoe: string;
  realCnt: number;
  lastRealUpdateAt: number;
}

const states = new Map<string, TableState>();

/** 실데이터 수신 시 상태 갱신 */
function ingestRealData(rooms: PhocoaRoom[], updatedAt: number): void {
  for (const room of rooms) {
    const tableId = String(room.table_id ?? "");
    if (!tableId) continue;
    const shoe = String(room.shoe ?? "");
    const cnt = Number(room.cnt ?? 0);
    const prev = states.get(tableId);
    // 실데이터는 항상 신뢰: 내용이 다르면 갱신 (슈 리셋 포함),
    // 내용이 같아도 수신 시각을 갱신해 예측 모드로 잘못 전환되지 않게 한다.
    if (!prev || prev.realShoe !== shoe || prev.realCnt !== cnt) {
      states.set(tableId, {
        tableId,
        tableNm: String(room.table_nm ?? ""),
        realShoe: shoe,
        realCnt: cnt,
        lastRealUpdateAt: updatedAt,
      });
    } else if (prev.lastRealUpdateAt < updatedAt) {
      // 데이터 내용은 같지만 최신 수신 확인 → 시각만 갱신 (게임 진행이 느린 테이블 오판 방지)
      prev.lastRealUpdateAt = updatedAt;
    }
  }
}

/** 결정적 의사난수 (시드 기반) - 같은 시드면 항상 같은 결과 */
function seededRandom(seed: number): number {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 문자열 해시 (테이블별 시드 분리용) */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h;
}

/**
 * 과거 슈에서 마르코프 전이 확률 학습:
 * 반환값 pAfter[prev] = prev 다음에 P가 나올 확률 (T 제외 기준)
 */
export function learnTransitions(shoe: string): { pAfterP: number; pAfterB: number; pRatio: number; tieRate: number } {
  const seq = shoe.split("");
  let pp = 0, pb = 0, bp = 0, bb = 0, p = 0, b = 0, t = 0;
  let prev: string | null = null;
  for (const ch of seq) {
    if (ch === "T") { t++; continue; }
    if (ch === "P") p++; else if (ch === "B") b++; else continue;
    if (prev === "P") { if (ch === "P") pp++; else pb++; }
    else if (prev === "B") { if (ch === "P") bp++; else bb++; }
    prev = ch;
  }
  const total = p + b;
  return {
    pAfterP: pp + pb > 0 ? pp / (pp + pb) : 0.49,
    pAfterB: bp + bb > 0 ? bp / (bp + bb) : 0.49,
    pRatio: total > 0 ? p / total : 0.49,
    tieRate: total + t > 0 ? t / (total + t) : 0.095,
  };
}

/**
 * 예측 슈 생성: 마지막 실데이터 이후 경과 시간에 따라
 * PREDICT_ROUND_MS마다 한 판씩 결정적으로 이어간다.
 */
export function extendShoe(
  tableId: string,
  realShoe: string,
  lastRealUpdateAt: number,
  now: number = Date.now(),
): { shoe: string; predictedFrom: number } {
  const elapsed = now - lastRealUpdateAt;
  if (elapsed < REAL_STALE_LIMIT_MS) return { shoe: realShoe, predictedFrom: -1 };
  const rounds = Math.min(
    Math.floor((elapsed - REAL_STALE_LIMIT_MS) / PREDICT_ROUND_MS) + 1,
    Math.max(0, MAX_SHOE_LEN - realShoe.length),
  );
  if (rounds <= 0) return { shoe: realShoe, predictedFrom: -1 };
  const model = learnTransitions(realShoe);
  let shoe = realShoe;
  const baseSeed = hashStr(tableId) ^ Math.floor(lastRealUpdateAt / 1000);
  for (let i = 0; i < rounds; i++) {
    // 각 판의 시드: 테이블+실데이터시각+판번호 → 모든 서버/클라이언트에서 동일
    const r = seededRandom(baseSeed + i * 7919);
    const rTie = seededRandom(baseSeed + i * 7919 + 13);
    if (rTie < model.tieRate) {
      shoe += "T";
      continue;
    }
    const lastNonTie = shoe.split("").reverse().find((c) => c === "P" || c === "B");
    const pProb = lastNonTie === "P" ? model.pAfterP : lastNonTie === "B" ? model.pAfterB : model.pRatio;
    shoe += r < pProb ? "P" : "B";
  }
  return { shoe, predictedFrom: realShoe.length };
}

/** Phocoa API 2 응답 생성 */
export async function getPhocoa2Rooms(now: number = Date.now()): Promise<Phocoa2Room[]> {
  // 실데이터 수신: 캐시가 fresh하면 반영
  const cache = getPhocoaCache();
  if (cache.rooms.length > 0 && !cache.stale) {
    ingestRealData(cache.rooms, cache.updatedAt);
  }
  const out: Phocoa2Room[] = [];
  for (const st of Array.from(states.values())) {
    const { shoe, predictedFrom } = extendShoe(st.tableId, st.realShoe, st.lastRealUpdateAt, now);
    out.push({
      table_id: st.tableId,
      table_nm: st.tableNm,
      shoe,
      cnt: shoe.length,
      predicted: predictedFrom >= 0,
      predicted_from: predictedFrom,
    });
  }
  return out;
}

/** 테스트용 초기화/주입 */
export function _resetPhocoa2ForTest(): void {
  states.clear();
}
export function _injectPhocoa2ForTest(tableId: string, tableNm: string, shoe: string, lastRealUpdateAt: number): void {
  states.set(tableId, { tableId, tableNm, realShoe: shoe, realCnt: shoe.length, lastRealUpdateAt });
}
