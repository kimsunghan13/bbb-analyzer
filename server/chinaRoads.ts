// 중국점(China Roads) 계산 엔진
// 슈(P/B 시퀀스)에서 빅로드(Big Road)를 구성하고,
// 대안로(Big Eye Boy, offset 1), 소로(Small Road, offset 2), 갑유로(Cockroach, offset 3)를 파생한다.
//
// 중국점의 각 항목은 R(빨강)=규칙적/정렬, B(파랑)=불규칙을 의미하며,
// 최근 항목들이 한 색으로 정렬될수록 현재 흐름이 예측 가능한 상태로 본다.

/** 빅로드 구성: 컬럼 배열 (각 컬럼은 같은 결과의 연속) */
export function buildBigRoad(shoe: string): string[][] {
  const seq = shoe.split("").filter((c) => c === "P" || c === "B");
  const cols: string[][] = [];
  for (const c of seq) {
    if (cols.length === 0 || cols[cols.length - 1][0] !== c) {
      cols.push([c]);
    } else {
      cols[cols.length - 1].push(c);
    }
  }
  return cols;
}

/**
 * 중국점 파생 계산 (표준 규칙 근사):
 * 새 항목이 추가될 때, 비교 대상 컬럼(offset만큼 왼쪽)과의 깊이/모양 비교로 R/B 결정.
 * - 새 컬럼 시작 시: (현재컬럼-1-offset) 컬럼과 (현재컬럼-1) 컬럼의 길이가 같으면 R, 다르면 B
 * - 컬럼 내 진행 시: (현재컬럼-offset) 컬럼의 같은 깊이에 항목이 있으면 R, 없으면 B (깊이 초과 시 R)
 */
export function deriveRoad(bigRoad: string[][], offset: number): string[] {
  const road: string[] = [];
  const startCol = offset; // 비교 가능해지는 최소 컬럼
  for (let col = startCol; col < bigRoad.length; col++) {
    for (let depth = 0; depth < bigRoad[col].length; depth++) {
      if (depth === 0) {
        // 새 컬럼 시작: 왼쪽 두 컬럼 길이 비교 (비교 대상이 없으면 판정 불가 → 건너뜀)
        if (col - 1 - offset < 0) continue;
        const a = bigRoad[col - 1] ? bigRoad[col - 1].length : 0;
        const b = bigRoad[col - 1 - offset] ? bigRoad[col - 1 - offset].length : 0;
        road.push(a === b ? "R" : "B");
      } else {
        // 컬럼 진행: offset 왼쪽 컬럼의 같은 깊이 항목 존재 여부
        const cmp = bigRoad[col - offset];
        if (!cmp) {
          road.push("B");
        } else if (cmp.length >= depth + 1) {
          road.push("R");
        } else if (cmp.length === depth) {
          road.push("B");
        } else {
          road.push("R"); // 깊이 초과 (이미 지나침) → 정렬 취급
        }
      }
    }
  }
  return road;
}

export interface ChinaRoadsAnalysis {
  bigEye: string[];
  small: string[];
  cockroach: string[];
  /** 0~100: 세 중국점의 최근 정렬도 (한 색으로 몰릴수록 높음) */
  alignmentScore: number;
}

/** 최근 n개 항목의 정렬도: 다수 색 비율 (0.5=혼돈, 1.0=완전 정렬) */
function recentAlignment(road: string[], n: number = 8): number {
  const recent = road.slice(-n);
  if (recent.length < 4) return 0.5; // 데이터 부족 시 중립
  const r = recent.filter((c) => c === "R").length;
  return Math.max(r, recent.length - r) / recent.length;
}

/** 슈에서 중국점 3종 계산 + 정렬도 점수 */
export function analyzeChinaRoads(shoe: string): ChinaRoadsAnalysis {
  const big = buildBigRoad(shoe);
  const bigEye = deriveRoad(big, 1);
  const small = deriveRoad(big, 2);
  const cockroach = deriveRoad(big, 3);
  // 세 중국점의 최근 정렬도 평균 → 0~100 스케일
  const avg = (recentAlignment(bigEye) + recentAlignment(small) + recentAlignment(cockroach)) / 3;
  // 실전 분포 보정: 실제 게임에서 정렬도 평균은 0.5~0.75 구간에 분포하므로
  // 0.5(혼돈) → 0점, 0.75(강한 정렬) → 100점으로 매핑 (0.75 초과는 100점)
  const alignmentScore = Math.round(Math.min(100, Math.max(0, ((avg - 0.5) / 0.25) * 100)));
  return { bigEye, small, cockroach, alignmentScore };
}
