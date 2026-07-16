import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { ANALYZER_COOKIE_NAME, ANALYZER_SESSION_MAX_AGE_MS } from "../shared/analyzerAuth";
import { createSessionToken, verifySessionToken, validateCredentials } from "./analyzerAuth";

type CookieCall = { name: string; value?: string; options: Record<string, unknown> };

function createCtx(cookieHeader?: string) {
  const setCookies: CookieCall[] = [];
  const clearedCookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as unknown as TrpcContext["res"],
  };
  return { ctx, setCookies, clearedCookies };
}

describe("validateCredentials", () => {
  it("accepts the fixed account qqq / asdf!@#", () => {
    expect(validateCredentials("qqq", "asdf!@#")).toBe(true);
  });
  it("accepts the added account aaa / 1234", () => {
    expect(validateCredentials("aaa", "1234")).toBe(true);
  });
  it("rejects wrong username or password", () => {
    expect(validateCredentials("qqq", "wrong")).toBe(false);
    expect(validateCredentials("admin", "asdf!@#")).toBe(false);
    expect(validateCredentials("aaa", "asdf!@#")).toBe(false);
    expect(validateCredentials("qqq", "1234")).toBe(false);
    expect(validateCredentials("", "")).toBe(false);
  });
});

describe("session token", () => {
  it("creates a verifiable token", () => {
    const token = createSessionToken("qqq");
    expect(verifySessionToken(token)).toBe(true);
  });
  it("rejects tampered tokens", () => {
    const token = createSessionToken("qqq");
    expect(verifySessionToken(token + "x")).toBe(false);
    expect(verifySessionToken("garbage")).toBe(false);
    expect(verifySessionToken(undefined)).toBe(false);
  });
  it("rejects expired tokens", () => {
    const past = Date.now() - ANALYZER_SESSION_MAX_AGE_MS - 1000;
    const token = createSessionToken("qqq", past);
    expect(verifySessionToken(token)).toBe(false);
  });
  it("verifies token for added account aaa", () => {
    const token = createSessionToken("aaa");
    expect(verifySessionToken(token)).toBe(true);
  });
  it("rejects token for unknown username", () => {
    const token = createSessionToken("hacker");
    expect(verifySessionToken(token)).toBe(false);
  });
});

describe("analyzerAuth.login", () => {
  it("sets session cookie on correct credentials", async () => {
    const { ctx, setCookies } = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analyzerAuth.login({ username: "qqq", password: "asdf!@#" });
    expect(result.success).toBe(true);
    expect(setCookies).toHaveLength(1);
    expect(setCookies[0]?.name).toBe(ANALYZER_COOKIE_NAME);
    expect(verifySessionToken(setCookies[0]?.value)).toBe(true);
    expect(setCookies[0]?.options).toMatchObject({ httpOnly: true, path: "/" });
  });
  it("sets session cookie for added account aaa / 1234", async () => {
    const { ctx, setCookies } = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analyzerAuth.login({ username: "aaa", password: "1234" });
    expect(result.success).toBe(true);
    expect(setCookies).toHaveLength(1);
    expect(verifySessionToken(setCookies[0]?.value)).toBe(true);
  });
  it("does not set cookie on wrong credentials", async () => {
    const { ctx, setCookies } = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analyzerAuth.login({ username: "qqq", password: "nope" });
    expect(result.success).toBe(false);
    expect(setCookies).toHaveLength(0);
  });
});

describe("analyzerAuth.status", () => {
  it("reports authenticated=true with valid cookie", async () => {
    const token = createSessionToken("qqq");
    const { ctx } = createCtx(`${ANALYZER_COOKIE_NAME}=${encodeURIComponent(token)}`);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analyzerAuth.status();
    expect(result.authenticated).toBe(true);
  });
  it("reports authenticated=false without cookie", async () => {
    const { ctx } = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analyzerAuth.status();
    expect(result.authenticated).toBe(false);
  });
});

describe("analyzerAuth.logout", () => {
  it("clears the session cookie", async () => {
    const { ctx, clearedCookies } = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analyzerAuth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(ANALYZER_COOKIE_NAME);
  });
});
