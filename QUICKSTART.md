# 빠른 시작 가이드

## 5분 안에 배포하기

### 1단계: 로컬 테스트 (2분)

```bash
# 파일 준비
unzip bbb-analyzer-deploy.zip
cd bbb-analyzer-deploy

# 의존성 설치
npm install

# 실행
npm start
```

브라우저에서 `http://localhost:3000` 접속 → 로그인 (qqq/asdf!@#)

---

### 2단계: Railway에 배포 (3분)

**가장 간단한 방법:**

1. GitHub에 프로젝트 업로드
2. [Railway.app](https://railway.app) 접속
3. GitHub로 로그인
4. "New Project" → "Deploy from GitHub"
5. 저장소 선택
6. 환경변수 추가:
   - `PORT=3000`
   - `NODE_ENV=production`
   - `JWT_SECRET=anything-you-want`
7. 배포 완료!

**배포된 URL로 접속 가능** ✅

---

## 로그인 정보

- **아이디**: qqq, **비밀번호**: asdf!@#
- **아이디**: aaa, **비밀번호**: 1234

---

## 문제 해결

| 문제 | 해결 |
|------|------|
| npm install 실패 | `npm cache clean --force` 후 재시도 |
| 포트 이미 사용 중 | `PORT=8080 npm start` |
| 배포 후 500 에러 | 서버 로그 확인, 환경변수 설정 확인 |

---

**상세 가이드는 DEPLOYMENT_GUIDE.md를 참고하세요.**
