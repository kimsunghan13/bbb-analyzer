import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loginMutation = trpc.analyzerAuth.login.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        // 서버 미들웨어가 쿠키를 확인하므로 전체 페이지 이동으로 진입
        window.location.href = "/analyzer";
      } else {
        setErrorMsg(data.message ?? "로그인에 실패했습니다.");
      }
    },
    onError: () => {
      setErrorMsg("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!username || !password) {
      setErrorMsg("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#191932] px-4">
      <Card className="w-full max-w-sm bg-[#22224a] border-[#33336a] text-gray-100 shadow-xl">
        <CardHeader className="text-center space-y-2">
          <CardDescription className="text-gray-400">
            로그인 후 이용하실 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-300">아이디</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디를 입력하세요"
                className="bg-[#191932] border-[#33336a] text-gray-100 placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">비밀번호</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="bg-[#191932] border-[#33336a] text-gray-100 placeholder:text-gray-500"
              />
            </div>
            {errorMsg && (
              <p className="text-sm text-red-400" role="alert">{errorMsg}</p>
            )}
            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 로그인 중...
                </>
              ) : (
                "로그인"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
