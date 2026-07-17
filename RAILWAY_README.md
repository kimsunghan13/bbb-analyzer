# bbb-analyzer: Railway 배포 가이드

## 🚀 프로젝트 개요

`bbb-analyzer`는 바카라 패턴을 분석하는 웹 애플리케이션입니다. React 19, Tailwind 4, Express 4, tRPC 11, Drizzle ORM으로 구성된 풀스택 프로젝트이며, Manus OAuth를 통해 사용자 인증을 처리합니다. 이 문서는 `bbb-analyzer`를 Railway에 성공적으로 배포하기 위한 가이드를 제공합니다.

## ✨ Railway 선택 이유

`bbb-analyzer`는 Node.js 기반의 백엔드 서버(Express)를 필요로 하는 풀스택 애플리케이션입니다. Vercel과 같은 정적 호스팅 서비스는 이러한 서버 환경을 직접 지원하지 않아 배포에 어려움이 있었습니다. Railway는 Node.js 애플리케이션에 대한 강력한 지원, 간편한 환경 변수 관리, GitHub 연동을 통한 자동 배포 기능 등을 제공하여 `bbb-analyzer`와 같은 프로젝트에 최적의 배포 환경을 제공합니다.

## 📋 주요 기술 스택

- **프론트엔드**: React 19, Tailwind 4
- **백엔드**: Express 4, tRPC 11
- **데이터베이스**: Drizzle ORM (MySQL/TiDB 호환)
- **인증**: Manus OAuth
- **패키지 관리**: pnpm

## 🚀 빠른 시작 (Quick Start)

이 섹션은 Railway에 익숙한 사용자를 위한 간략한 배포 절차입니다. 자세한 내용은 `RAILWAY_STEP_BY_STEP.md`를 참조하세요.

1.  **GitHub 리포지토리 준비**: `bbb-analyzer` 프로젝트 코드를 GitHub에 푸시합니다.
2.  **Railway 프로젝트 생성**: Railway 대시보드에서 `New Project`를 선택하고 `Deploy from GitHub Repo`를 통해 `bbb-analyzer` 리포지토리를 연결합니다.
3.  **환경 변수 설정**: Railway 프로젝트 설정에서 다음 환경 변수를 추가합니다.
    -   `NODE_ENV`: `production`
    -   `JWT_SECRET`: `your_secret_key_here` (보안을 위해 강력한 값으로 변경)
    -   `DATABASE_URL`: Manus에서 제공하는 TiDB Cloud (MySQL) 연결 문자열
        (예: `mysql://user:password@host:port/database?ssl={
  `"rejectUnauthorized":true}"`) 
4.  **배포**: 환경 변수 설정 후 Railway가 자동으로 배포를 시작합니다. 배포가 완료되면 제공되는 URL로 접속하여 앱을 확인합니다.

## 📚 상세 가이드 문서

초보자도 쉽게 따라할 수 있도록 다음 5가지 상세 가이드 문서를 제공합니다.

1.  **RAILWAY_QUICK_START.md**: Railway 계정 생성부터 첫 배포까지의 핵심 단계 요약.
2.  **RAILWAY_STEP_BY_STEP.md**: 각 단계별 상세 설명과 스크린샷을 포함한 완벽 가이드.
3.  **RAILWAY_CHECKLIST.md**: 배포 전후 확인해야 할 사항들을 정리한 체크리스트.
4.  **RAILWAY_ENV_SETUP.md**: 환경 변수 설정 및 데이터베이스 연결 방법에 대한 심층 가이드.
5.  **RAILWAY_TROUBLESHOOTING.md**: 발생 가능한 문제점과 해결 방법을 정리한 FAQ.

이 문서들과 함께 `bbb-analyzer-railway-ready.zip` 파일을 다운로드하여 Railway에 배포를 시작할 수 있습니다.
