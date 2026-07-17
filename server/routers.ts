import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { ANALYZER_COOKIE_NAME } from "../shared/analyzerAuth";
import { getPhocoaCache } from "./phocoaCache";
import { ensureFreshPhocoa } from "./phocoaCache";
import { ensureFreshCasinoScores, getCasinoScoresSnapshot } from "./casinoScoresCache";
import {
  createSessionToken,
  getSessionCookieOpts,
  isAuthenticated,
  validateCredentials,
} from "./analyzerAuth";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 분석기 접근용 아이디/비밀번호 세션 인증
  analyzerAuth: router({
    status: publicProcedure.query(({ ctx }) => ({
      authenticated: isAuthenticated(ctx.req),
    })),
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(({ ctx, input }) => {
        if (!validateCredentials(input.username, input.password)) {
          return { success: false as const, message: "아이디 또는 비밀번호가 올바르지 않습니다." };
        }
        const token = createSessionToken(input.username);
        ctx.res.cookie(ANALYZER_COOKIE_NAME, token, getSessionCookieOpts(ctx.req));
        return { success: true as const };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const opts = getSessionCookieOpts(ctx.req);
      ctx.res.clearCookie(ANALYZER_COOKIE_NAME, { ...opts, maxAge: -1 });
      return { success: true as const };
    }),
  }),

  // CasinoScores 프록시 - CORS 우회 (기존 분석기 UI가 호출)
  baccarat: router({
    getTables: publicProcedure.query(async () => {
      return [
        { id: "lightningbaccarat", name: "Lightning Baccarat" },
        { id: "speedbaccarata", name: "Speed Baccarat A" },
      ];
    }),
    getResults: publicProcedure
      .input(
        z
          .object({
            table: z.string().default("lightningbaccarat"),
            size: z.number().min(1).max(500).default(200),
            duration: z.number().min(1).max(72).default(6),
          })
          .optional(),
      )
      .query(async ({ input }) => {
        const table = input?.table ?? "lightningbaccarat";
        // 서버 백그라운드 캐시에서 즉시 응답 (밀림/지연 없음)
        await ensureFreshCasinoScores(table);
        const { snapshot, stale } = await getCasinoScoresSnapshot(table);
        if (!snapshot) throw new Error("CasinoScores data unavailable");
        return { ...snapshot, stale };
      }),
    getStatus: publicProcedure
      .input(z.object({ table: z.string().default("lightningbaccarat") }).optional())
      .query(async ({ input }) => {
        const { updatedAt, ageMs, stale } = await getCasinoScoresSnapshot(
          input?.table ?? "lightningbaccarat",
        );
        return { updatedAt, ageMs, stale };
      }),
  }),

  // Phocoa API 프록시
  phocoa: router({
    getAllRooms: publicProcedure.query(async () => {
      // 서버가 백그라운드에서 지속 갱신하는 캐시를 즉시 반환 (요청 지연/밀림 없음)
      await ensureFreshPhocoa();
      return getPhocoaCache().rooms;
    }),
    getStatus: publicProcedure.query(async () => {
      const { updatedAt, ageMs, stale } = getPhocoaCache();
      return { updatedAt, ageMs, stale };
    }),
  }),
});

export type AppRouter = typeof appRouter;
