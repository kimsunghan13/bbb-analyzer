// 분석기 접근용 고정 계정 및 세션 쿠키 상수
export const ANALYZER_COOKIE_NAME = "analyzer_session";
export const ANALYZER_ACCOUNTS: ReadonlyArray<{ username: string; password: string }> = [
  { username: "qqq", password: "asdf!@#" },
  { username: "aaa", password: "1234" },
];
export const ANALYZER_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30일
