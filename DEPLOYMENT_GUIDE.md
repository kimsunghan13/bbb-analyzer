# bbb-analyzer 배포 가이드

## 개요

**bbb-analyzer**는 Baccarat 패턴 분석기입니다. 이 가이드는 무료 서버에서 프로젝트를 배포하는 방법을 설명합니다.

**특징:**
- 데이터베이스 불필요 (메모리 기반)
- 고정 ID/비밀번호 로그인 (qqq, aaa)
- Node.js 기반 (Express + React)
- 포트 3000에서 실행

---

## 1. 시스템 요구사항

- **Node.js**: v18 이상
- **npm 또는 pnpm**: 패키지 관리자
- **메모리**: 최소 512MB
- **포트**: 3000 (또는 환경변수로 변경 가능)

---

## 2. 로컬 설치 및 테스트

### 2.1 파일 준비

```bash
# 압축 파일 해제
unzip bbb-analyzer-deploy.zip
cd bbb-analyzer-deploy
```

### 2.2 환경 설정

```bash
# .env 파일 생성 (또는 .env.example을 .env로 복사)
cp .env.example .env

# 필요시 .env 파일 수정
# PORT=3000
# NODE_ENV=production
# JWT_SECRET=your-secret-key
```

### 2.3 의존성 설치 및 실행

```bash
# npm 사용
npm install
npm start

# 또는 pnpm 사용 (권장)
pnpm install
pnpm start
```

### 2.4 확인

브라우저에서 `http://localhost:3000` 접속
- 로그인 페이지 표시 확인
- 아이디: `qqq`, 비밀번호: `asdf!@#` 로 로그인 테스트

---

## 3. 무료 서버 추천

### 옵션 1: **Railway** (권장 - 가장 간단함)

**장점:**
- 무료 크레딧 $5/월 제공
- GitHub 연동 자동 배포
- 환경변수 설정 간단
- 콘솔 로그 확인 가능

**단점:**
- 무료 크레딧 소진 후 유료
- 트래픽 많으면 빨리 소진

**배포 방법:**
1. [Railway.app](https://railway.app) 가입
2. GitHub 계정 연동
3. "New Project" → "Deploy from GitHub"
4. 저장소 선택
5. 환경변수 설정 (PORT, NODE_ENV, JWT_SECRET)
6. 자동 배포 시작

---

### 옵션 2: **Render** (무료 플랜 제한 있음)

**장점:**
- 항상 무료 (단, 15분 비활성 후 슬립)
- GitHub 자동 배포
- SSL 포함

**단점:**
- 무료 플랜은 15분 비활성 후 슬립 모드 진입
- 첫 요청 시 5-10초 대기 (콜드 스타트)

**배포 방법:**
1. [Render.com](https://render.com) 가입
2. "New +" → "Web Service"
3. GitHub 저장소 연결
4. 빌드 설정:
   - Build Command: `npm install && npm run build` (또는 `pnpm install && pnpm build`)
   - Start Command: `npm start` (또는 `pnpm start`)
5. 환경변수 설정
6. 배포

---

### 옵션 3: **Heroku** (무료 플랜 중단됨 - 비권장)

현재 Heroku는 무료 플랜을 제공하지 않습니다.

---

### 옵션 4: **Replit** (초보자 친화적)

**장점:**
- 웹 IDE 제공
- 간단한 배포
- 무료 호스팅

**단점:**
- 성능 제한
- 트래픽 제한

**배포 방법:**
1. [Replit.com](https://replit.com) 가입
2. "Create" → "Import from GitHub"
3. 저장소 URL 입력
4. `.replit` 파일 생성:
   ```
   run = "npm install && npm start"
   ```
5. Run 클릭

---

## 4. Railway 상세 배포 가이드 (권장)

### 4.1 사전 준비

- GitHub 계정 필요
- 프로젝트를 GitHub에 업로드

```bash
# 로컬에서 GitHub에 푸시
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/bbb-analyzer.git
git push -u origin main
```

### 4.2 Railway에서 배포

1. [Railway.app](https://railway.app)에 접속
2. GitHub로 로그인
3. "New Project" 클릭
4. "Deploy from GitHub repo" 선택
5. 저장소 선택 (bbb-analyzer)
6. 자동 감지 후 배포 시작

### 4.3 환경변수 설정

Railway 대시보드에서:
1. 프로젝트 선택
2. "Variables" 탭
3. 다음 환경변수 추가:

```
PORT=3000
NODE_ENV=production
JWT_SECRET=your-random-secret-key-here
```

### 4.4 배포 확인

1. "Deployments" 탭에서 배포 상태 확인
2. 배포 완료 후 "Open" 클릭
3. 로그인 페이지 표시 확인

---

## 5. Render 상세 배포 가이드

### 5.1 사전 준비

- GitHub에 프로젝트 업로드

### 5.2 Render에서 배포

1. [Render.com](https://render.com)에 접속
2. GitHub로 로그인
3. "New +" → "Web Service"
4. GitHub 저장소 연결
5. 설정:
   - **Name**: bbb-analyzer
   - **Region**: Singapore (또는 가까운 지역)
   - **Branch**: main
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
6. "Create Web Service" 클릭

### 5.3 환경변수 설정

배포 후:
1. 프로젝트 대시보드
2. "Environment" 탭
3. 환경변수 추가:

```
PORT=3000
NODE_ENV=production
JWT_SECRET=your-random-secret-key-here
```

### 5.4 배포 확인

1. "Logs" 탭에서 배포 로그 확인
2. 배포 완료 후 URL 클릭
3. 로그인 페이지 표시 확인

---

## 6. 로그인 정보

배포 후 접속 시 다음 계정으로 로그인:

| 아이디 | 비밀번호 |
|--------|---------|
| qqq    | asdf!@# |
| aaa    | 1234    |

---

## 7. 트러블슈팅

### 포트 에러 (Port already in use)

```bash
# 다른 포트로 실행
PORT=8080 npm start
```

### 의존성 설치 실패

```bash
# 캐시 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

### 배포 후 500 에러

1. 서버 로그 확인
2. 환경변수 설정 확인 (JWT_SECRET 등)
3. Node.js 버전 확인 (v18 이상 필요)

### 로그인 불가

- 아이디/비밀번호 확인: qqq/asdf!@#, aaa/1234
- 브라우저 쿠키 활성화 확인
- 개발자 도구 → Network 탭에서 요청 확인

---

## 8. 성능 최적화

### 메모리 사용량 모니터링

```bash
# 로컬에서 메모리 사용량 확인
node --max-old-space-size=256 dist/index.js
```

### 포트 변경

```bash
PORT=8080 npm start
```

---

## 9. 업데이트 및 유지보수

### 로컬에서 변경 후 배포

```bash
# 1. 로컬에서 변경
# 2. 빌드
npm run build

# 3. GitHub에 푸시
git add .
git commit -m "Update"
git push

# 4. Railway/Render에서 자동 배포 (GitHub 연동 시)
```

---

## 10. 보안 주의사항

- **JWT_SECRET**: 프로덕션에서는 복잡한 문자열로 변경
- **로그인 계정**: 필요시 `shared/analyzerAuth.ts`에서 계정 변경
- **HTTPS**: Railway/Render에서 자동 제공

---

## 11. 추가 지원

- 문제 발생 시 서버 로그 확인
- Railway: 대시보드 → Logs
- Render: 대시보드 → Logs

---

**배포 완료!** 🎉

이제 `https://your-app-name.railway.app` (또는 Render URL)에서 접속 가능합니다.
