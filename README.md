# bbb-analyzer - Baccarat 패턴 분석기

**독립형 배포 패키지**

이 패키지는 외부 서버에서 독립적으로 구동할 수 있도록 준비된 bbb-analyzer입니다.

## 📋 포함 내용

- **dist/** - 빌드된 프로덕션 코드 (프론트엔드 + 백엔드)
- **package.json** - 의존성 정의
- **pnpm-lock.yaml** - 의존성 잠금 파일
- **.env.example** - 환경변수 템플릿
- **DEPLOYMENT_GUIDE.md** - 상세 배포 가이드
- **QUICKSTART.md** - 빠른 시작 가이드

## 🚀 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 실행
npm start

# 3. 브라우저에서 접속
# http://localhost:3000
```

## 🔐 로그인 정보

| 아이디 | 비밀번호 |
|--------|---------|
| qqq    | asdf!@# |
| aaa    | 1234    |

## 📦 배포 옵션

### 권장: Railway
- 무료 크레딧 $5/월
- 자동 배포
- [배포 가이드](DEPLOYMENT_GUIDE.md#4-railway-상세-배포-가이드-권장)

### 대안: Render
- 항상 무료 (15분 비활성 후 슬립)
- [배포 가이드](DEPLOYMENT_GUIDE.md#5-render-상세-배포-가이드)

### 기타: Replit
- 웹 IDE 제공
- [배포 가이드](DEPLOYMENT_GUIDE.md#옵션-4-replit-초보자-친화적)

## 📚 문서

- **[QUICKSTART.md](QUICKSTART.md)** - 5분 안에 배포하기
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - 상세 배포 가이드

## ⚙️ 시스템 요구사항

- Node.js v18+
- npm 또는 pnpm
- 메모리 512MB+
- 포트 3000 (또는 환경변수로 변경)

## 🔧 환경변수

```bash
PORT=3000                    # 포트 (기본값: 3000)
NODE_ENV=production          # 환경 (production/development)
JWT_SECRET=your-secret-key   # 세션 서명 키
```

## 📊 기능

- ✅ 고정 ID/비밀번호 로그인
- ✅ 데이터베이스 불필요 (메모리 기반)
- ✅ 실시간 패턴 분석
- ✅ Phocoa API 통합
- ✅ solsystem 독립 예측 엔진

## 🛠️ 기술 스택

- **프론트엔드**: React 19 + Tailwind CSS
- **백엔드**: Express + tRPC
- **런타임**: Node.js

## 📝 라이선스

MIT

## 🆘 지원

배포 중 문제 발생 시:
1. 서버 로그 확인
2. [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#7-트러블슈팅)의 트러블슈팅 섹션 참고
3. 환경변수 설정 확인

---

**배포 준비 완료!** 🎉

[QUICKSTART.md](QUICKSTART.md)에서 시작하세요.
