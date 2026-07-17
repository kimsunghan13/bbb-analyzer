import "dotenv/config";
import express from "express";
import { createServer } from "http";
import dns from "node:dns";
import path from "node:path";
import fs from "node:fs";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { requireAnalyzerAuth, getAuthenticatedUsername } from "../analyzerAuth";
import { startPhocoaPolling, getPhocoaCache } from "../phocoaCache";
import { ensureFreshPhocoa } from "../phocoaCache";
import { startCasinoScoresPolling, getCasinoScoresSnapshot } from "../casinoScoresCache";
import { ensureFreshCasinoScores } from "../casinoScoresCache";
import { getPhocoa2Rooms } from "../phocoa2";
import { analyzeTables, topStreakCandidates, selectPrimeCandidate } from "../streakAnalyzer";
import { updateWatchList, getStreakStats } from "../watchConfirm";

// 일부 프로덕션 환경에서 IPv6 경로의 TLS 문제를 피하기 위해 IPv4 우선
dns.setDefaultResultOrder("ipv4first");

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // Phocoa 캐시 REST 엔드포인트: 기존 분석기 번들이 phocoa.com을 직접 호출하던 것을
  // 자체 서버의 캐시 응답으로 대체 (POST 방식 그대로 지원)
  app.post("/api/phocoa/3matrix4", async (_req, res) => {
    await ensureFreshPhocoa();
    res.json(getPhocoaCache().rooms);
  });
  // Phocoa API 2: 자체 저장 데이터 + 예측 엔진 (Phocoa와 동일 형식)
  app.post("/api/phocoa2/3matrix4", async (_req, res) => {
    await ensureFreshPhocoa();
    res.json(await getPhocoa2Rooms());
  });
  app.get("/api/phocoa/status", (_req, res) => {
    const { updatedAt, ageMs, stale } = getPhocoaCache();
    res.json({ updatedAt, ageMs, stale });
  });
  // 연승 가능성 분석 알림 (qqq 계정 전용)
  // NOTE: 사용자 요청으로 기능 표시 차단됨 (2026-07-15). 화면 패턴과 서버 패턴 정의
  // 불일치 문제로 비활성화. 재활성화하려면 STREAK_ALERTS_DISABLED를 false로 변경.
  const STREAK_ALERTS_DISABLED = true;
  app.get("/api/streak-alerts", async (req, res) => {
    if (STREAK_ALERTS_DISABLED) {
      res.json({ enabled: false, candidates: [] });
      return;
    }
    const username = getAuthenticatedUsername(req);
    if (username !== "qqq") {
      // qqq가 아니면 빈 목록 (기능 자체를 노출하지 않음)
      res.json({ enabled: false, candidates: [] });
      return;
    }
    await ensureFreshPhocoa();
    const rooms = getPhocoaCache().rooms;
    const results = analyzeTables(rooms);
    const candidates = topStreakCandidates(results, 65, 5);
    const prime = selectPrimeCandidate(results, 60);
    const watch = updateWatchList(results, rooms);
    res.json({
      enabled: true,
      prime,
      candidates,
      watching: watch.watching,
      confirmed: watch.confirmed,
      ended: watch.ended,
      stats: getStreakStats(),
      analyzedTables: results.length,
      serverTime: Date.now(),
    });
  });
  // 통합 데이터 신선도 상태 (분석기 화면의 신선도 표시/경고 배너용)
  app.get("/api/feeds/status", async (req, res) => {
    const table = typeof req.query.table === "string" ? req.query.table : "lightningbaccarat";
    await ensureFreshPhocoa();
    void ensureFreshCasinoScores(table);
    const phocoa = getPhocoaCache();
    const cs = await getCasinoScoresSnapshot(table);
    res.json({
      phocoa: { updatedAt: phocoa.updatedAt, ageMs: phocoa.ageMs, stale: phocoa.stale },
      casinoscores: {
        updatedAt: cs.updatedAt,
        ageMs: cs.ageMs,
        stale: cs.stale,
        errors: cs.consecutiveErrors,
        lastError: cs.lastError,
        lastAttemptAt: cs.lastAttemptAt,
      },
      serverTime: Date.now(),
    });
  });
  // 분석기 페이지 라우트 보호: 미인증 시 /login 으로 리다이렉트
  // 정적 자산은 client/public (dev) 또는 dist/public (prod) 에 위치
  const publicDir =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "client", "public")
      : path.resolve(import.meta.dirname, "public");
  const analyzerHtml = path.resolve(publicDir, "analyzer", "index.html");
  app.get(["/analyzer", "/analyzer/*"], requireAnalyzerAuth, (_req, res) => {
    if (fs.existsSync(analyzerHtml)) {
      res.sendFile(analyzerHtml);
    } else {
      res.status(404).send("Analyzer build not found");
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  // Phocoa 백그라운드 폴링 시작 (클라이언트 요청과 무관하게 서버가 항상 최신 데이터 유지)
  startPhocoaPolling();
  // CasinoScores 백그라운드 폴링 시작
  startCasinoScoresPolling();


  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
