import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

/**
 * 홈: 인증 상태에 따라 분석기(/analyzer) 또는 로그인(/login)으로 이동
 */
export default function Home() {
  const { data, isLoading } = trpc.analyzerAuth.status.useQuery();

  useEffect(() => {
    if (isLoading) return;
    if (data?.authenticated) {
      window.location.href = "/analyzer";
    } else {
      window.location.href = "/login";
    }
  }, [data, isLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#191932]">
      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
    </div>
  );
}
