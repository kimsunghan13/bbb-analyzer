# Railway 단계별 배포 가이드: bbb-analyzer

이 문서는 `bbb-analyzer` 프로젝트를 Railway에 배포하는 과정을 단계별로 상세하게 설명합니다. 각 단계마다 필요한 작업과 주의사항을 포함하며, 초보자도 쉽게 따라할 수 있도록 구성되었습니다.

## 1. GitHub 리포지토리 준비

Railway는 GitHub 리포지토리와 연동하여 코드를 가져오고 자동으로 배포합니다. 따라서 `bbb-analyzer` 프로젝트 코드가 GitHub에 업로드되어 있어야 합니다.

1.  **GitHub 계정 생성**: 아직 GitHub 계정이 없다면 [GitHub 웹사이트](https://github.com/)에서 계정을 생성합니다.
2.  **새 리포지토리 생성**: GitHub에 로그인한 후, `New` 버튼을 클릭하여 새 리포지토리를 생성합니다. 리포지토리 이름은 `bbb-analyzer`로 하는 것이 좋습니다.
3.  **코드 푸시**: 로컬 `bbb-analyzer` 프로젝트 코드를 새로 생성한 GitHub 리포지토리에 푸시합니다.
    ```bash
    cd /path/to/your/bbb-analyzer
    git init
    git add .
    git commit -m "Initial commit for bbb-analyzer"
    git branch -M main
    git remote add origin https://github.com/YOUR_GITHUB_USERNAME/bbb-analyzer.git
    git push -u origin main
    ```
    (여기서 `YOUR_GITHUB_USERNAME`은 본인의 GitHub 사용자 이름으로 변경해야 합니다.)

## 2. Railway 계정 생성 및 로그인

Railway 서비스를 이용하기 위해 계정을 생성하고 로그인해야 합니다.

1.  **Railway 웹사이트 접속**: 웹 브라우저를 열고 [https://railway.app/](https://railway.app/)에 접속합니다.
2.  **로그인**: 우측 상단의 `Login` 버튼을 클릭합니다. Railway는 GitHub 계정을 통한 로그인을 지원합니다. `Continue with GitHub`를 선택합니다.
3.  **GitHub 권한 부여**: GitHub 로그인 페이지로 리다이렉트되면 GitHub 계정으로 로그인하고, Railway가 GitHub 리포지토리에 접근할 수 있도록 권한을 부여합니다. (모든 리포지토리에 대한 접근 권한을 부여하는 것이 가장 편리하지만, 특정 리포지토리만 선택할 수도 있습니다.)

## 3. Railway 새 프로젝트 생성

GitHub 리포지토리를 Railway에 연결하여 새 프로젝트를 생성합니다.

1.  **New Project 클릭**: Railway 대시보드에 로그인한 후, 좌측 상단 또는 중앙에 있는 `New Project` 버튼을 클릭합니다.
2.  **Deploy from GitHub Repo 선택**: 프로젝트 생성 옵션 중 `Deploy from GitHub Repo`를 선택합니다.
3.  **리포지토리 선택**: GitHub 리포지토리 목록에서 `bbb-analyzer`를 검색하여 선택합니다. 만약 리포지토리가 보이지 않는다면, GitHub 계정 권한 설정을 다시 확인하거나 Railway의 GitHub 앱 설정을 통해 권한을 업데이트해야 합니다.
4.  **프로젝트 이름 확인**: 프로젝트 이름이 `bbb-analyzer`로 자동 설정되는지 확인합니다. 필요하다면 변경할 수 있습니다.
5.  **Deploy! 클릭**: `Deploy!` 버튼을 클릭하여 프로젝트 생성을 완료합니다. Railway가 자동으로 코드를 클론하고 초기 배포를 시도합니다.

## 4. 환경 변수 설정

`bbb-analyzer`는 `NODE_ENV`, `JWT_SECRET`, `DATABASE_URL`과 같은 환경 변수를 필요로 합니다. 이 변수들을 Railway 프로젝트에 설정해야 합니다.

1.  **Variables 탭 이동**: Railway 프로젝트 대시보드에서 좌측 메뉴의 `Variables` 탭을 클릭합니다.
2.  **환경 변수 추가**: `New Variable` 버튼을 클릭하여 다음 변수들을 하나씩 추가합니다.
    -   **`NODE_ENV`**
        -   `Name`: `NODE_ENV`
        -   `Value`: `production`
    -   **`JWT_SECRET`**
        -   `Name`: `JWT_SECRET`
        -   `Value`: `your_secret_key_here` (이 값은 **매우 중요**합니다. 보안을 위해 **반드시** 강력하고 유니크한 문자열로 변경해야 합니다. 예: `openssl rand -base64 32` 명령어를 터미널에서 실행하여 생성된 값을 사용하세요.)
    -   **`DATABASE_URL`**
        -   `Name`: `DATABASE_URL`
        -   `Value`: Manus에서 제공하는 TiDB Cloud (MySQL) 연결 문자열을 입력합니다. 이 값은 Manus 프로젝트 설정에서 확인할 수 있습니다. 형식은 `mysql://user:password@host:port/database?ssl={"rejectUnauthorized":true}`와 유사합니다. (`ssl` 부분은 반드시 포함되어야 합니다.)

    (스크린샷: Railway Variables 탭에서 환경 변수 추가 화면)

3.  **변경 사항 저장**: 환경 변수를 추가하면 Railway가 자동으로 변경 사항을 감지하고 프로젝트를 재배포합니다.

## 5. 배포 확인 및 앱 접속

환경 변수 설정 후 Railway가 자동으로 프로젝트를 재배포합니다. 배포가 성공했는지 확인하고 앱에 접속합니다.

1.  **Deployments 탭 이동**: Railway 프로젝트 대시보드에서 좌측 메뉴의 `Deployments` 탭을 클릭합니다.
2.  **배포 진행 상황 모니터링**: 최신 배포의 진행 상황을 확인합니다. 빌드 및 배포 과정은 몇 분 정도 소요될 수 있습니다.
3.  **배포 성공 확인**: 배포가 성공하면 `Status` 열에 `Success`가 표시됩니다. 만약 `Failed`가 표시된다면 `RAILWAY_TROUBLESHOOTING.md`를 참조하세요.
4.  **앱 접속**: 배포가 성공하면 `Domains` 탭으로 이동하여 제공되는 URL을 클릭합니다. 이 URL이 `bbb-analyzer` 앱의 라이브 주소입니다.

    (스크린샷: Railway Domains 탭에서 앱 URL 확인 화면)

## 6. 앱 기능 테스트

앱에 접속한 후 주요 기능이 정상적으로 작동하는지 확인합니다.

1.  **로그인 페이지 확인**: 제공된 URL로 접속했을 때 `bbb-analyzer`의 로그인 페이지가 정상적으로 표시되는지 확인합니다.
2.  **로그인 테스트**: 다음 계정으로 로그인 테스트를 진행합니다.
    -   ID: `qqq` / PW: `asdf!@#`
    -   ID: `aaa` / PW: `1234`
3.  **분석기 페이지 확인**: 로그인 성공 후 분석기 페이지로 이동하는지, 데이터가 정상적으로 로드되고 표시되는지 확인합니다.
4.  **로그아웃 테스트**: 로그아웃 기능이 정상적으로 작동하는지 확인합니다.

**축하합니다! 이제 `bbb-analyzer`가 Railway에 성공적으로 배포되었고, 주요 기능이 정상적으로 작동하는 것을 확인했습니다!**

---
