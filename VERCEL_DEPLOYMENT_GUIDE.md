# 🚀 Vercel에 bbb-analyzer 배포하기 (초보자용 완벽 가이드)

이 가이드는 **GitHub 계정이 있으면 누구나 따라할 수 있습니다.** 약 **5분** 소요됩니다.

---

## 📋 준비물

- **GitHub 계정** (없으면 [github.com](https://github.com)에서 무료 가입)
- **Vercel 계정** (GitHub로 로그인하면 자동 생성)

---

## 🎯 배포 3단계

### **1단계: GitHub에 코드 올리기** (2분)

#### 1-1. GitHub에서 새 저장소 만들기

1. [github.com](https://github.com)에 로그인
2. 우측 상단 **`+`** 버튼 → **`New repository`** 클릭
3. 저장소 이름 입력: **`bbb-analyzer`**
4. **`Create repository`** 클릭

#### 1-2. 코드 업로드

터미널(명령 프롬프트)을 열고 다음 명령어를 입력하세요:

```bash
# 1. 프로젝트 폴더로 이동
cd /path/to/bbb-analyzer

# 2. 기존 원격 저장소 제거 (Manus 저장소 대신 GitHub 사용)
git remote remove origin

# 3. GitHub 저장소 추가 (YOUR_USERNAME을 자신의 GitHub 아이디로 변경)
git remote add origin https://github.com/YOUR_USERNAME/bbb-analyzer.git

# 4. 모든 파일을 GitHub에 푸시
git branch -M main
git push -u origin main
```

**예시:**
```bash
git remote add origin https://github.com/john123/bbb-analyzer.git
git push -u origin main
```

✅ **완료:** GitHub 저장소에 코드가 올라갔습니다!

---

### **2단계: Vercel에 배포하기** (2분)

#### 2-1. Vercel 계정 만들기

1. [vercel.com](https://vercel.com)에 접속
2. **`Sign Up`** 클릭
3. **`Continue with GitHub`** 클릭
4. GitHub 로그인 및 권한 승인

#### 2-2. 프로젝트 배포

1. Vercel 대시보드에서 **`Add New...`** → **`Project`** 클릭
2. **`Import Git Repository`** 클릭
3. **`bbb-analyzer`** 저장소 선택
4. **`Import`** 클릭

#### 2-3. 환경 변수 설정 (중요!)

배포 전에 **환경 변수**를 설정해야 합니다.

**`Environment Variables`** 섹션에서 다음을 추가하세요:

| 이름 | 값 | 설명 |
|------|-----|------|
| `NODE_ENV` | `production` | 프로덕션 모드 |
| `JWT_SECRET` | `your-secret-key-12345` | 세션 암호화 키 (아무 문자열이나 가능) |

**예시:**
```
JWT_SECRET = my-super-secret-key-2024
```

> **팁:** `JWT_SECRET`은 복잡할수록 좋습니다. 예: `aB3$xY9@mK2!pL5#qW8`

#### 2-4. 배포 시작

1. 모든 설정 확인 후 **`Deploy`** 버튼 클릭
2. 배포 진행 중... (약 2-3분 소요)
3. ✅ **배포 완료!** 

배포 완료 후 **`Visit`** 버튼을 클릭하면 앱이 실행됩니다!

---

### **3단계: 앱 테스트하기** (1분)

#### 3-1. 로그인 확인

배포된 사이트에 접속하면 **로그인 페이지**가 나타납니다.

다음 계정으로 로그인하세요:

| 아이디 | 비밀번호 |
|--------|---------|
| `qqq` | `asdf!@#` |
| `aaa` | `1234` |

#### 3-2. 분석기 확인

로그인 후 **"스피드 bbb 3매 패턴 분석기"** 페이지가 나타나면 배포 성공입니다! 🎉

---

## 🔧 배포 후 설정

### 커스텀 도메인 연결 (선택사항)

1. Vercel 대시보드에서 프로젝트 선택
2. **`Settings`** → **`Domains`** 클릭
3. 도메인 입력 후 **`Add`** 클릭
4. DNS 설정 완료

### 환경 변수 변경

1. Vercel 대시보드에서 프로젝트 선택
2. **`Settings`** → **`Environment Variables`** 클릭
3. 수정 후 **`Save`** 클릭
4. 자동으로 재배포됩니다

---

## ❌ 배포 실패 시 해결 방법

### 문제: "Build failed" 에러

**해결:**
1. Vercel 대시보드에서 **`Deployments`** 탭 확인
2. 실패한 배포 클릭 → **`Logs`** 확인
3. 에러 메시지 확인 후 GitHub 코드 수정
4. `git push`하면 자동으로 재배포됨

### 문제: 로그인 페이지만 나오고 분석기가 안 보임

**해결:**
1. 계정 확인: `qqq` / `asdf!@#` 또는 `aaa` / `1234`
2. 브라우저 캐시 삭제: `Ctrl+Shift+Delete` (Windows) 또는 `Cmd+Shift+Delete` (Mac)
3. 다시 로그인

### 문제: 환경 변수 설정 후에도 작동 안 함

**해결:**
1. Vercel 대시보드에서 **`Deployments`** 탭
2. 최신 배포 클릭 → **`Redeploy`** 버튼 클릭
3. 환경 변수가 적용되어 재배포됨

---

## 📞 추가 도움말

### Vercel 배포 상태 확인

1. Vercel 대시보드 접속
2. **`Deployments`** 탭에서 배포 상태 확인
3. 초록색 ✅ = 배포 성공
4. 빨간색 ❌ = 배포 실패 (로그 확인)

### 코드 수정 후 자동 배포

GitHub에 코드를 `push`하면 Vercel이 **자동으로 재배포**합니다!

```bash
# 코드 수정 후
git add .
git commit -m "Fix: 버그 수정"
git push origin main

# Vercel이 자동으로 재배포 시작 (2-3분 소요)
```

---

## 🎓 용어 설명

| 용어 | 설명 |
|------|------|
| **GitHub** | 코드 저장소 (클라우드 드라이브처럼 생각하면 됨) |
| **Vercel** | 배포 플랫폼 (GitHub의 코드를 웹사이트로 만들어줌) |
| **환경 변수** | 앱이 실행될 때 필요한 설정값 (비밀번호, API 키 등) |
| **배포** | 코드를 인터넷에 올려서 누구나 접속할 수 있게 하는 것 |
| **재배포** | 코드 수정 후 다시 배포하는 것 |

---

## ✅ 배포 완료 체크리스트

- [ ] GitHub 계정 생성
- [ ] GitHub에 코드 업로드
- [ ] Vercel 계정 생성
- [ ] Vercel에서 프로젝트 연결
- [ ] 환경 변수 설정 (`NODE_ENV`, `JWT_SECRET`)
- [ ] 배포 시작
- [ ] 배포 완료 확인 (초록색 ✅)
- [ ] 로그인 테스트 (`qqq` / `asdf!@#`)
- [ ] 분석기 페이지 확인

---

## 🎉 축하합니다!

**bbb-analyzer가 인터넷에 올라갔습니다!**

이제 누구나 URL을 통해 접속할 수 있습니다.

**배포된 URL:** `https://bbb-analyzer-YOUR_USERNAME.vercel.app`

---

## 💡 다음 단계

1. **도메인 구입** (선택): 커스텀 도메인으로 더 전문적으로 보이게 할 수 있음
2. **모니터링**: Vercel 대시보드에서 앱 상태 모니터링
3. **백업**: GitHub에 정기적으로 코드 백업

---

**질문이 있으신가요?** Vercel 공식 문서: [vercel.com/docs](https://vercel.com/docs)
