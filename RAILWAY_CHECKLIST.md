# Railway 배포 체크리스트: bbb-analyzer

이 체크리스트는 `bbb-analyzer` 프로젝트를 Railway에 배포하기 전과 후에 확인해야 할 주요 사항들을 정리한 문서입니다. 각 항목을 꼼꼼히 확인하여 성공적인 배포를 완료하세요.

## 📝 배포 전 체크리스트

### 1. GitHub 리포지토리 준비

-   [ ] `bbb-analyzer` 프로젝트 코드가 GitHub 리포지토리에 푸시되었습니까?
-   [ ] 리포지토리가 `public` 또는 Railway가 접근할 수 있는 권한으로 설정되었습니까?
-   [ ] `pnpm-lock.yaml` 파일이 리포지토리에 포함되어 있습니까? (일관된 의존성 설치를 위해 중요)

### 2. Railway 계정 및 권한

-   [ ] Railway 계정이 생성되었고 GitHub 계정으로 로그인했습니까?
-   [ ] Railway가 `bbb-analyzer` 리포지토리에 접근할 수 있는 권한이 부여되었습니까?

### 3. 프로젝트 설정 파일

-   [ ] `railway.json` 파일이 프로젝트 루트에 올바르게 생성되었습니까?
    -   `buildCommand`: `pnpm install --no-frozen-lockfile && pnpm run build`
    -   `startCommand`: `node dist/index.js`
-   [ ] `.railwayignore` 파일이 불필요한 파일(예: `node_modules`, `.git`, `dist` 등)을 제외하도록 올바르게 설정되었습니까?

### 4. 환경 변수 (매우 중요!)

-   [ ] `NODE_ENV` 변수가 `production`으로 설정되었습니까?
-   [ ] `JWT_SECRET` 변수가 강력하고 유니크한 값으로 설정되었습니까?
-   [ ] `DATABASE_URL` 변수가 Manus에서 제공하는 TiDB Cloud (MySQL) 연결 문자열로 올바르게 설정되었습니까? (`ssl={"rejectUnauthorized":true}` 포함 여부 확인)

## ✅ 배포 후 체크리스트

### 1. Railway 배포 상태

-   [ ] Railway 대시보드의 `Deployments` 탭에서 최신 배포 상태가 `Success`로 표시됩니까?
-   [ ] 배포 로그에 에러 메시지가 없습니까?

### 2. 앱 접속

-   [ ] `Domains` 탭에서 제공되는 URL로 접속했을 때 `bbb-analyzer` 로그인 페이지가 정상적으로 표시됩니까?
-   [ ] 서버 소스 코드가 아닌, 실제 웹 페이지가 로드됩니까?

### 3. 기능 테스트

-   [ ] `qqq` / `asdf!@#` 계정으로 로그인이 정상적으로 작동합니까?
-   [ ] `aaa` / `1234` 계정으로 로그인이 정상적으로 작동합니까?
-   [ ] 로그인 후 분석기 페이지로 이동하며, 데이터가 정상적으로 로드되고 표시됩니까?
-   [ ] 로그아웃 기능이 정상적으로 작동합니까?
-   [ ] (선택 사항) `solsystem` 모드 전환 등 주요 기능이 정상적으로 작동합니까?

### 4. 데이터베이스 연결

-   [ ] 앱에서 데이터베이스 관련 기능(예: 사용자 정보 저장, 데이터 로드)이 오류 없이 작동합니까?

---
