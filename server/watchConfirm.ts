// 2단계 검증 후보 추적기
// 1) 분석 시점: 각 테이블에서 패턴 A/B/C/D 중 1위(O/X 점수 최고)인 패턴이
//    결합 점수 85점 이상 & 최근 적중률 50% 이상 & 전체 확률(적중률) 50% 이상이면
//    "관찰(watching)" 상태로 등록
// 2) 다음 판 결과 도착: 해당 패턴의 예측이 적중(O)이면 "확정(confirmed)", 빗나가면 탈락(dropped)
// 확정된 후보는 이후 예측이 빗나갈 때까지 유지된다.
// 성과 통계: 확정된 후보가 3연승(확정 포함 3승)에 도달했는지를 누적 집계한다.

import { type TableStreakResult } from "./streakAnalyzer";
import { buildHitHistory } from "./streakAnalyzer";

const MIN_COMBINED = 85;
const MIN_HIT_RATE = 50; // 최근 적중률(%) 최소 기준
const MIN_OVERALL_RATE = 50; // 전체 확률(적중률, %) 최소 기준 - 화면의 "확률" 값과 동일
const MAX_WATCH_AGE_MS = 10 * 60 * 1000; // 10분 내 다음 판이 없으면 관찰 만료
const ENDED_DISPLAY_MS = 60 * 1000; // 패배 종료 후보를 1분간 표시 후 제거

export interface WatchedCandidate {
  key: string; // tableId:pattern
  tableId: string;
  tableNm: string;
  pattern: string;
  combinedScore: number;
  oxScore: number;
  roadAlignment: number;
  shoeLenAtWatch: number; // 관찰 등록 시점의 유효(P/B) 슈 길이
  watchedAt: number;
  status: "watching" | "confirmed" | "ended";
  confirmedAt?: number;
  winsSinceConfirm?: number;
  endedAt?: number;
  finalWins?: number; // 종료 시점까지의 확정 후 연승 수
  currentRounds?: number; // 현재 테이블 판수 (P/B 유효 판수)
  recentHitRate?: number; // 등록 시점 최근 적중률(%)
  overallHitRate?: number; // 등록 시점 전체 확률(%)
  nextPrediction: string | null;
}

const tracked = new Map<string, WatchedCandidate>();

// 3연승 도달률 통계 (서버 기동 후 누적)
let statConfirmedTotal = 0; // 확정된 후보 수 (결과 판정 완료 기준)
let statReached3 = 0; // 그중 3연승(확정 후 3승) 도달 수
const reachedKeys = new Set<string>(); // 이미 3연승으로 집계된 후보

function effectiveLen(shoe: string): number {
  let n = 0;
  for (const c of shoe) if (c === "P" || c === "B") n++;
  return n;
}

/**
 * 분석 결과와 현재 슈 데이터로 상태를 갱신하고 현재 관찰/확정 목록을 반환.
 * rooms: 현재 Phocoa 캐시 (tableId → shoe 매핑용)
 */
export function updateWatchList(
  results: TableStreakResult[],
  rooms: Array<{ table_id: unknown; table_nm: unknown; shoe: unknown }>,
  now: number = Date.now(),
): { watching: WatchedCandidate[]; confirmed: WatchedCandidate[]; ended: WatchedCandidate[] } {
  const shoeMap = new Map<string, string>();
  for (const r of rooms) shoeMap.set(String(r.table_id ?? ""), String(r.shoe ?? ""));

  // 1) 기존 추적 항목 상태 갱신
  for (const [key, w] of Array.from(tracked.entries())) {
    if (w.status === "ended") {
      if (now - (w.endedAt ?? 0) > ENDED_DISPLAY_MS) tracked.delete(key);
      continue;
    }
    const shoe = shoeMap.get(w.tableId);
    if (shoe === undefined) { tracked.delete(key); continue; }
    const len = effectiveLen(shoe);
    if (w.status === "watching") {
      if (now - w.watchedAt > MAX_WATCH_AGE_MS) { tracked.delete(key); continue; }
      w.currentRounds = len;
      if (len > w.shoeLenAtWatch) {
        // 관찰 후 새 판 도착 → "첫째 판" 판정 (도착 순서 기준)
        // 주의: 폴링 간격 사이에 여러 판이 한꺼번에 도착할 수 있으므로,
        // 관찰 시점 이후 도착한 판들을 순서대로 보고 첫째 판이 O(승리)인지 확인한다.
        const hits = buildHitHistory(w.pattern, shoe);
        const newRounds = len - w.shoeLenAtWatch;
        const arrived = hits.slice(-newRounds); // 도착 순서대로의 O/X
        if (arrived.length > 0 && arrived[0] === true) {
          // 첫째 판 O 승리 → 확정. 이후 연속 O까지 연승으로 인정
          let wins = 0;
          for (const h of arrived) {
            if (h) wins++;
            else break;
          }
          if (wins === arrived.length) {
            // 도착한 판 모두 O → 확정 유지, 연승 = wins
            w.status = "confirmed";
            w.confirmedAt = now;
            w.winsSinceConfirm = wins;
            w.shoeLenAtWatch = len;
          } else {
            // 첫째 판은 O였지만 이후 X가 이미 나옴 → 확정 즉시 종료 처리
            w.status = "ended";
            w.endedAt = now;
            w.finalWins = wins;
          }
        } else {
          tracked.delete(key); // 첫째 판 X → 탈락
        }
      }
    } else {
      // confirmed: 예측이 빗나가면 해제, 적중이면 연승 갱신
      w.currentRounds = len;
      if (len > w.shoeLenAtWatch) {
        const hits = buildHitHistory(w.pattern, shoe);
        // 새로 도착한 판 수만큼 뒤에서 판정
        const newRounds = len - w.shoeLenAtWatch;
        const recent = hits.slice(-newRounds);
        if (recent.every(Boolean)) {
          w.winsSinceConfirm = (w.winsSinceConfirm ?? 0) + recent.length;
          if ((w.winsSinceConfirm ?? 0) >= 3 && !reachedKeys.has(w.key + ":" + w.watchedAt)) {
            reachedKeys.add(w.key + ":" + w.watchedAt);
            statReached3++;
            statConfirmedTotal++; // 3연승 도달 시점에 결과 확정으로 집계
          }
        } else {
          // 패배로 종료: 즉시 삭제하지 않고 "ended" 상태로 1분간 표시해
          // 사용자가 결과(X 패배)를 인지할 수 있게 한다
          const missIdx = recent.findIndex((h) => !h);
          w.status = "ended";
          w.endedAt = now;
          w.finalWins = (w.winsSinceConfirm ?? 0) + (missIdx > 0 ? missIdx : 0);
          // 3연승 도달 전에 패배로 끝난 경우만 실패로 집계 (도달 후 패배는 이미 집계됨)
          if (!reachedKeys.has(w.key + ":" + w.watchedAt)) {
            statConfirmedTotal++;
          }
          continue;
        }
        w.shoeLenAtWatch = len;
      }
    }
  }

  // 2) 새 후보 등록: 각 테이블의 "1위 패턴"(O/X 점수 최고)만 대상으로,
  //    결합 점수 70점 이상이면 관찰 등록
  for (const r of results) {
    if (r.patterns.length === 0) continue;
    // 테이블 내 1위 패턴 선정 (O/X 점수 기준, 동점이면 먼저 나온 것)
    let best = r.patterns[0];
    for (const p of r.patterns) {
      if (p.score > best.score) best = p;
    }
    const combined = Math.round(best.score * 0.7 + r.roadAlignment * 0.3);
    if (combined < MIN_COMBINED) continue;
    if (best.recentHitRate < MIN_HIT_RATE) continue; // 최근 적중률 50% 미만 제외
    if (best.overallHitRate < MIN_OVERALL_RATE) continue; // 전체 확률 50% 미만 제외
    const key = `${r.tableId}:${best.pattern}`;
    if (tracked.has(key)) {
      // 이미 추적 중이면 점수 정보만 갱신
      const w = tracked.get(key)!;
      w.combinedScore = combined;
      w.oxScore = best.score;
      w.roadAlignment = r.roadAlignment;
      w.recentHitRate = best.recentHitRate;
      w.overallHitRate = best.overallHitRate;
      w.nextPrediction = best.nextPrediction;
      continue;
    }
    const shoe = shoeMap.get(r.tableId) ?? "";
    tracked.set(key, {
      key,
      tableId: r.tableId,
      tableNm: r.tableNm,
      pattern: best.pattern,
      combinedScore: combined,
      oxScore: best.score,
      roadAlignment: r.roadAlignment,
      shoeLenAtWatch: effectiveLen(shoe),
      watchedAt: now,
      status: "watching",
      currentRounds: effectiveLen(shoe),
      recentHitRate: best.recentHitRate,
      overallHitRate: best.overallHitRate,
      nextPrediction: best.nextPrediction,
    });
  }

  const all = Array.from(tracked.values());
  return {
    watching: all.filter((w) => w.status === "watching").sort((a, b) => b.combinedScore - a.combinedScore),
    confirmed: all.filter((w) => w.status === "confirmed").sort((a, b) => (b.confirmedAt ?? 0) - (a.confirmedAt ?? 0)),
    ended: all.filter((w) => w.status === "ended").sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0)),
  };
}

/** 3연승 도달률 통계 조회 */
export function getStreakStats(): { confirmedTotal: number; reached3: number; reachRate: number | null } {
  return {
    confirmedTotal: statConfirmedTotal,
    reached3: statReached3,
    reachRate: statConfirmedTotal > 0 ? Math.round((statReached3 / statConfirmedTotal) * 100) : null,
  };
}

export function _resetWatchForTest(): void {
  tracked.clear();
  statConfirmedTotal = 0;
  statReached3 = 0;
  reachedKeys.clear();
}
