import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import {
  ANALYZER_ACCOUNTS,
  ANALYZER_COOKIE_NAME,
  ANALYZER_SESSION_MAX_AGE_MS,
} from "../shared/analyzerAuth";

const SECRET = process.env.JWT_SECRET || "analyzer-fallback-secret";

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

/** 세션 토큰 생성: base64(username|expiresAt).signature */
export function createSessionToken(username: string, now: number = Date.now()): string {
  const expiresAt = now + ANALYZER_SESSION_MAX_AGE_MS;
  const payload = `${username}|${expiresAt}`;
  const encoded = Buffer.from(payload, "utf-8").toString("base64url");
  return `${encoded}.${sign(payload)}`;
}

/** 세션 토큰 검증 */
export function verifySessionToken(token: string | undefined, now: number = Date.now()): boolean {
  return getTokenUsername(token, now) !== null;
}

/** 세션 토큰에서 사용자명 추출 (유효하지 않으면 null) */
export function getTokenUsername(token: string | undefined, now: number = Date.now()): string | null {
  if (!token) return null;
  const dotIdx = token.lastIndexOf(".");
  if (dotIdx <= 0) return null;
  const encoded = token.slice(0, dotIdx);
  const givenSig = token.slice(dotIdx + 1);
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf-8");
  } catch {
    return null;
  }
  const expectedSig = sign(payload);
  const a = Buffer.from(givenSig, "utf-8");
  const b = Buffer.from(expectedSig, "utf-8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const parts = payload.split("|");
  if (parts.length !== 2) return null;
  const [username, expiresAtStr] = parts;
  if (!ANALYZER_ACCOUNTS.some((acc) => acc.username === username)) return null;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return null;
  return username;
}

/** 아이디/비밀번호 검증 (고정 계정 목록) */
export function validateCredentials(username: string, password: string): boolean {
  const u = Buffer.from(username, "utf-8");
  const p = Buffer.from(password, "utf-8");
  let matched = false;
  for (const acc of ANALYZER_ACCOUNTS) {
    const eu = Buffer.from(acc.username, "utf-8");
    const ep = Buffer.from(acc.password, "utf-8");
    const userOk = u.length === eu.length && timingSafeEqual(u, eu);
    const passOk = p.length === ep.length && timingSafeEqual(p, ep);
    if (userOk && passOk) matched = true;
  }
  return matched;
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function isAuthenticated(req: Request): boolean {
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[ANALYZER_COOKIE_NAME]);
}

/** 요청에서 로그인된 사용자명 추출 (미인증 시 null) */
export function getAuthenticatedUsername(req: Request): string | null {
  const cookies = parseCookies(req);
  return getTokenUsername(cookies[ANALYZER_COOKIE_NAME]);
}

export function getSessionCookieOpts(req: Request) {
  const secure = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ANALYZER_SESSION_MAX_AGE_MS,
  };
}

/** 라우트 보호 미들웨어: 미인증 시 로그인 페이지로 리다이렉트 */
export function requireAnalyzerAuth(req: Request, res: Response, next: NextFunction) {
  if (isAuthenticated(req)) return next();
  res.redirect(302, "/login");
}
