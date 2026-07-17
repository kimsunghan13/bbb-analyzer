# Railway 빠른 시작 가이드: bbb-analyzer 배포

이 가이드는 `bbb-analyzer` 프로젝트를 Railway에 빠르게 배포하기 위한 핵심 단계를 요약합니다. Railway 계정 생성부터 첫 배포까지의 과정을 간략하게 설명합니다.

## 1. Railway 계정 생성 및 로그인

1.  [Railway 웹사이트](https://railway.app/)에 접속합니다.
2.  `Login` 버튼을 클릭하고 GitHub 계정으로 로그인합니다. (GitHub 계정이 없다면 먼저 생성해야 합니다.)
3.  Railway가 GitHub 리포지토리에 접근할 수 있도록 권한을 부여합니다.

## 2. 새 프로젝트 생성

1.  Railway 대시보드에서 `New Project` 버튼을 클릭합니다.
2.  `Deploy from GitHub Repo` 옵션을 선택합니다.
3.  `bbb-analyzer` 리포지토리를 검색하여 선택합니다. (만약 보이지 않는다면, GitHub 계정 권한 설정을 확인하거나 `Configure Railway on GitHub`를 클릭하여 권한을 부여해야 합니다.)

## 3. 환경 변수 설정

프로젝트가 생성되면 자동으로 배포가 시작될 수 있지만, 환경 변수를 먼저 설정해야 합니다.

1.  Railway 프로젝트 대시보드에서 `Variables` 탭으로 이동합니다.
2.  다음 환경 변수들을 추가합니다.
    -   `NODE_ENV`: `production`
    -   `JWT_SECRET`: `your_secret_key_here` (보안을 위해 **반드시** 강력하고 유니크한 값으로 변경하세요. 예: `openssl rand -base64 32` 명령어로 생성)
    -   `DATABASE_URL`: Manus에서 제공하는 TiDB Cloud (MySQL) 연결 문자열을 입력합니다. 이 값은 Manus 프로젝트 설정에서 확인할 수 있습니다. (예: `mysql://user:password@host:port/database?ssl={
  `"rejectUnauthorized":true}"`) 이 값은 Manus 프로젝트 설정에서 확인할 수 있습니다.

## 4. 배포 확인

1.  환경 변수 설정 후 Railway가 자동으로 프로젝트를 재배포합니다.
2.  `Deployments` 탭에서 배포 진행 상황을 모니터링합니다.
3.  배포가 성공하면 `Status`가 `Success`로 표시됩니다.
4.  `Domains` 탭에서 제공되는 URL을 클릭하여 `bbb-analyzer` 앱에 접속합니다.

## 5. 앱 접속 및 로그인 테스트

1.  제공된 URL로 접속하여 로그인 페이지가 정상적으로 표시되는지 확인합니다.
2.  다음 계정으로 로그인 테스트를 진행합니다.
    -   ID: `qqq` / PW: `asdf!@#`
    -   ID: `aaa` / PW: `1234`
3.  로그인 후 분석기 페이지가 정상적으로 작동하는지 확인합니다.

**축하합니다! 이제 `bbb-analyzer`가 Railway에 성공적으로 배포되었습니다!**

더 자세한 내용은 `RAILWAY_STEP_BY_STEP.md`를 참조하세요.
