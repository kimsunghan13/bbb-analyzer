# Railway 배포 문제 해결 (Troubleshooting): bbb-analyzer

이 문서는 `bbb-analyzer`를 Railway에 배포하는 과정에서 발생할 수 있는 일반적인 문제점들과 그 해결 방법을 안내합니다. 문제가 발생했을 때 당황하지 않고 이 가이드를 따라 해결해 보세요.

## 1. 배포 실패 (Deployment Failed)

Railway 대시보드의 `Deployments` 탭에서 배포 상태가 `Failed`로 표시되는 경우입니다.

-   **원인**: 빌드 명령어 오류, 의존성 설치 실패, 코드 오류 등 다양한 원인이 있을 수 있습니다.
-   **해결 방법**:
    1.  **로그 확인**: `Deployments` 탭에서 실패한 배포를 클릭한 후 `Logs` 탭으로 이동합니다. 에러 메시지를 자세히 확인하여 어떤 단계에서 문제가 발생했는지 파악합니다. (예: `pnpm install` 실패, `vite build` 실패, `esbuild` 실패 등)
    2.  **`package.json` 확인**: `package.json` 파일의 `scripts` 섹션에 `build` 명령어가 올바르게 정의되어 있는지 확인합니다.
        ```json
        "scripts": {
          "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
        }
        ```
    3.  **`railway.json` 확인**: `railway.json` 파일의 `buildCommand`가 올바른지 확인합니다.
        ```json
        {
          "buildCommand": "pnpm install --no-frozen-lockfile && pnpm run build"
        }
        ```
    4.  **로컬에서 빌드 테스트**: 프로젝트 루트 디렉토리에서 `pnpm install && pnpm run build` 명령어를 실행하여 로컬에서도 빌드가 실패하는지 확인합니다. 로컬에서 실패한다면 코드 자체에 문제가 있는 것입니다.
    5.  **의존성 문제**: `pnpm-lock.yaml` 파일이 GitHub 리포지토리에 포함되어 있는지 확인합니다. 이 파일이 없으면 Railway가 의존성을 일관되게 설치하지 못할 수 있습니다.

## 2. 앱 접속 시 404 Not Found 또는 서버 코드 노출

배포는 성공했지만, 앱 URL로 접속했을 때 404 에러가 발생하거나, 웹 페이지 대신 서버 소스 코드가 그대로 보이는 경우입니다.

-   **원인**: `startCommand` 오류, 정적 파일 경로 오류, 라우팅 설정 오류 등.
-   **해결 방법**:
    1.  **`railway.json` `startCommand` 확인**: `railway.json` 파일의 `startCommand`가 `node dist/index.js`로 올바르게 설정되어 있는지 확인합니다.
        ```json
        {
          "startCommand": "node dist/index.js"
        }
        ```
    2.  **`dist` 디렉토리 구조 확인**: 빌드 후 `dist` 디렉토리 내에 `index.js` (서버 코드)와 `public` 디렉토리 (정적 파일)가 올바르게 생성되었는지 확인합니다.
        ```
        dist/
        ├── index.js
        └── public/
            ├── index.html
            └── assets/
        ```
    3.  **Express 정적 파일 서빙 경로 확인**: `server/_core/index.ts` 파일에서 Express가 정적 파일을 서빙하는 경로가 `dist/public`을 참조하는지 확인합니다.

## 3. 환경 변수 문제 (Environment Variable Issues)

환경 변수가 제대로 설정되지 않아 앱이 비정상적으로 작동하는 경우입니다.

-   **원인**: 환경 변수 이름 오타, 값 누락, 잘못된 값 입력 등.
-   **해결 방법**:
    1.  **Railway `Variables` 탭 확인**: Railway 프로젝트 대시보드의 `Variables` 탭에서 `NODE_ENV`, `JWT_SECRET`, `DATABASE_URL` 세 가지 변수가 올바른 이름과 값으로 설정되어 있는지 다시 확인합니다.
    2.  **`JWT_SECRET` 유효성**: `JWT_SECRET` 값이 충분히 길고 복잡한지 확인합니다. 너무 짧거나 단순한 값은 보안 문제뿐만 아니라 앱 동작에도 영향을 줄 수 있습니다.
    3.  **`DATABASE_URL` 형식 확인**: `DATABASE_URL`의 형식이 `mysql://user:password@host:port/database?ssl={"rejectUnauthorized":true}`와 일치하는지, 특히 `ssl` 옵션이 포함되어 있는지 확인합니다.

## 4. 데이터베이스 연결 실패

앱은 실행되지만, 로그인 또는 데이터 로드 시 데이터베이스 관련 오류가 발생하는 경우입니다.

-   **원인**: `DATABASE_URL` 오류, 데이터베이스 서버 접근 문제, 방화벽 설정 등.
-   **해결 방법**:
    1.  **`DATABASE_URL` 재확인**: `RAILWAY_ENV_SETUP.md`를 참조하여 `DATABASE_URL`이 정확한지 다시 확인합니다. 사용자명, 비밀번호, 호스트, 포트, 데이터베이스명이 모두 일치해야 합니다.
    2.  **Manus 프로젝트 설정 확인**: Manus 프로젝트 설정에서 제공된 `DATABASE_URL`이 여전히 유효한지 확인합니다.
    3.  **Railway 서비스 로그 확인**: Railway `Deployments` 탭의 `Logs`에서 데이터베이스 연결 관련 에러 메시지(예: `Failed to connect to database`)가 있는지 확인합니다.
    4.  **데이터베이스 방화벽**: TiDB Cloud (MySQL)의 경우, Railway 서버의 IP 주소가 데이터베이스 방화벽에 허용되어 있는지 확인해야 할 수 있습니다. (일반적으로 Railway는 동적 IP를 사용하므로 `0.0.0.0/0` 또는 `Allow all IP addresses`로 설정해야 할 수 있습니다. 이는 보안상 권장되지 않으므로, 가능하면 Railway의 고정 IP 기능을 사용하거나 특정 IP 대역을 허용하는 방법을 찾아보세요.)

## 5. 앱이 느리거나 응답 없음

앱이 배포되었지만 매우 느리거나 간헐적으로 응답하지 않는 경우입니다.

-   **원인**: 리소스 부족, 비효율적인 코드, 외부 API 지연 등.
-   **해결 방법**:
    1.  **Railway 리소스 확인**: Railway 프로젝트 설정에서 할당된 CPU, RAM 등의 리소스가 충분한지 확인합니다. 필요하다면 플랜을 업그레이드하여 리소스를 늘릴 수 있습니다.
    2.  **코드 최적화**: 서버 코드에서 비효율적인 데이터베이스 쿼리나 복잡한 연산이 있는지 검토합니다. 특히 외부 API 호출이 많은 경우, 캐싱 전략을 도입하여 응답 속도를 개선할 수 있습니다.
    3.  **외부 API 상태 확인**: `bbb-analyzer`는 Phocoa API와 Casino Scores API를 사용합니다. 이들 외부 API의 상태가 불안정하거나 지연이 발생하는지 확인합니다. (예: `RAILWAY_README.md`에 언급된 GamblingCounting API와 같은 대안을 고려할 수 있습니다.)

---
