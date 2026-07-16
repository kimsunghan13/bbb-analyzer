// 연승 가능성 분석 엔진
// 각 테이블의 슈(P/B/T)에서 패턴 A/B/C/D의 예측 O/X 이력을 재구성하고,
// 통계 지표를 종합해 "앞으로 연승이 나올 가능성 점수"를 계산한다.
//
// 패턴 정의 (분석기 화면과 동일한 계열의 예측 규칙):
//  A: 직전 결과 반대 (핑퐁 추종)
//  B: 직전 결과 동일 (흐름 추종)
//  C: 2판 전 결과 동일 (2주기 반복)
//  D: 최근 3판 다수결 반대 (역추세)
//
// 점수 요소 (0~100):
//  1. 연승 빈도 (이력에서 3연승 이상 발생 비율) - 30점
//  2. 평균 연승 길이 - 20점
//  3. 최근 모멘텀 (최근 10판 적중률) - 30점
//  4. 현재 연승 진행 가산점 (1~2연승 중이면 3연승 도달 가능성) - 20점

import { analyzeChinaRoads } from "./chinaRoads";

export interface PatternStreakScore {
  pattern: "A" | "B" | "C" | "D";
  score: number;
  currentStreak: number;
  recentHitRate: number;
  overallHitRate: number; // 화면의 "확률"과 동일: 전체 적중/(적중+미적) %
  streakFrequency: number;
  avgStreakLength: number;
  nextPrediction: "P" | "B" | null;
}

export interface TableStreakResult {
  tableId: string;
  tableNm: string;
  patterns: PatternStreakScore[];
  /** 중국점 정렬도 (0~100) */
  roadAlignment: number;
}

/** 패턴별 다음 예측 계산 */
function predictNext(pattern: string, seq: string[]): "P" | "B" | null {
  const n = seq.length;
  if (pattern === "A") {
    if (n < 1) return null;
    return seq[n - 1] === "P" ? "B" : "P";
  }
  if (pattern === "B") {
    if (n < 1) return null;
    return seq[n - 1] === "P" ? "P" : "B";
  }
  if (pattern === "C") {
    if (n < 2) return null;
    return seq[n - 2] === "P" ? "P" : "B";
  }
  // D: 최근 3판 다수결의 반대
  if (n < 3) return null;
  const last3 = seq.slice(n - 3);
  const pCount = last3.filter((c) => c === "P").length;
  return pCount >= 2 ? "B" : "P";
}

/** 슈에서 특정 패턴의 O/X 이력 생성 */
export function buildHitHistory(pattern: string, shoe: string): boolean[] {
  const seq = shoe.split("").filter((c) => c === "P" || c === "B"); // 타이 제외
  const hits: boolean[] = [];
  const minLen = pattern === "D" ? 3 : pattern === "C" ? 2 : 1;
  for (let i = minLen; i < seq.length; i++) {
    const pred = predictNext(pattern, seq.slice(0, i));
    if (pred === null) continue;
    hits.push(pred === seq[i]);
  }
  return hits;
}

/** O/X 이력에서 연승 통계 계산 */
export function analyzeStreaks(hits: boolean[]): {
  currentStreak: number;
  recentHitRate: number;
  streakFrequency: number;
  avgStreakLength: number;
} {
  // 현재 연승 (뒤에서부터 연속 O)
  let currentStreak = 0;
  for (let i = hits.length - 1; i >= 0 && hits[i]; i--) currentStreak++;
  // 최근 10판 적중률
  const recent = hits.slice(-10);
  const recentHitRate = recent.length > 0 ? recent.filter(Boolean).length / recent.length : 0;
  // 연승 구간 추출
  const streaks: number[] = [];
  let run = 0;
  for (const h of hits) {
    if (h) run++;
    else {
      if (run > 0) streaks.push(run);
      run = 0;
    }
  }
  if (run > 0) streaks.push(run);
  const longStreaks = streaks.filter((s) => s >= 3).length;
  const streakFrequency = streaks.length > 0 ? longStreaks / streaks.length : 0;
  const avgStreakLength = streaks.length > 0 ? streaks.reduce((a, b) => a + b, 0) / streaks.length : 0;
  return { currentStreak, recentHitRate, streakFrequency, avgStreakLength };
}

/** 연승 가능성 점수 계산 (0~100) */
export function scoreStreakPotential(stats: ReturnType<typeof analyzeStreaks>): number {
  let score = 0;
  // 1. 연승 빈도 (0~30)
  score += Math.min(30, stats.streakFrequency * 60);
  // 2. 평균 연승 길이 (0~20): 평균 2.5 이상이면 만점
  score += Math.min(20, (stats.avgStreakLength / 2.5) * 20);
  // 3. 최근 모멘텀 (0~30): 최근 10판 적중률
  score += stats.recentHitRate * 30;
  // 4. 현재 연승 가산점 (0~20): 1연승 8점, 2연승 16점, 3연승+ 20점
  score += Math.min(20, stats.currentStreak * 8);
  return Math.round(Math.min(100, score));
}

/** 전체 테이블 분석 */
export function analyzeTables(
  rooms: Array<{ table_id: unknown; table_nm: unknown; shoe: unknown }>,
  minShoeLength: number = 12,
): TableStreakResult[] {
  const results: TableStreakResult[] = [];
  for (const room of rooms) {
    const shoe = String(room.shoe ?? "");
    const effective = shoe.split("").filter((c) => c === "P" || c === "B").length;
    if (effective < minShoeLength) continue;
    const patterns: PatternStreakScore[] = [];
    for (const p of ["A", "B", "C", "D"] as const) {
      const hits = buildHitHistory(p, shoe);
      if (hits.length < 8) continue;
      const stats = analyzeStreaks(hits);
      const seq = shoe.split("").filter((c) => c === "P" || c === "B");
      const overallHits = hits.filter(Boolean).length;
      patterns.push({
        pattern: p,
        score: scoreStreakPotential(stats),
        currentStreak: stats.currentStreak,
        recentHitRate: Math.round(stats.recentHitRate * 100),
        overallHitRate: Math.round((overallHits / hits.length) * 1000) / 10,
        streakFrequency: Math.round(stats.streakFrequency * 100),
        avgStreakLength: Math.round(stats.avgStreakLength * 10) / 10,
        nextPrediction: predictNext(p, seq),
      });
    }
    if (patterns.length > 0) {
      const roads = analyzeChinaRoads(shoe);
      results.push({
        tableId: String(room.table_id ?? ""),
        tableNm: String(room.table_nm ?? ""),
        patterns,
        roadAlignment: roads.alignmentScore,
      });
    }
  }
  return results;
}

/** 상위 후보 추출 (점수 임계 이상, 상위 N개) */
export function topStreakCandidates(
  results: TableStreakResult[],
  minScore: number = 65,
  limit: number = 5,
): Array<{ tableNm: string; pattern: string; score: number; currentStreak: number; recentHitRate: number; nextPrediction: string | null }> {
  const flat: Array<{ tableNm: string; pattern: string; score: number; currentStreak: number; recentHitRate: number; nextPrediction: string | null }> = [];
  for (const r of results) {
    for (const p of r.patterns) {
      if (p.score >= minScore) {
        flat.push({
          tableNm: r.tableNm,
          pattern: p.pattern,
          score: p.score,
          currentStreak: p.currentStreak,
          recentHitRate: p.recentHitRate,
          nextPrediction: p.nextPrediction,
        });
      }
    }
  }
  flat.sort((a, b) => b.score - a.score);
  return flat.slice(0, limit);
}

export interface PrimeCandidate {
  tableNm: string;
  pattern: string;
  combinedScore: number;
  oxScore: number;
  roadAlignment: number;
  currentStreak: number;
  recentHitRate: number;
  nextPrediction: string | null;
}

/**
 * 최우선 3연승 후보 선택:
 * 결합점수 = O/X 통계 점수 70% + 중국점 정렬도 30%
 * 현 시점 최고 결합점수 1개 패턴을 반환 (최소 기준 미달 시 null)
 */
export function selectPrimeCandidate(results: TableStreakResult[], minCombined: number = 60): PrimeCandidate | null {
  let best: PrimeCandidate | null = null;
  for (const r of results) {
    for (const p of r.patterns) {
      const combined = Math.round(p.score * 0.7 + r.roadAlignment * 0.3);
      if (combined < minCombined) continue;
      if (!best || combined > best.combinedScore) {
        best = {
          tableNm: r.tableNm,
          pattern: p.pattern,
          combinedScore: combined,
          oxScore: p.score,
          roadAlignment: r.roadAlignment,
          currentStreak: p.currentStreak,
          recentHitRate: p.recentHitRate,
          nextPrediction: p.nextPrediction,
        };
      }
    }
  }
  return best;
}
