# Next.js 동적 배포 가이드 (Vercel, AWS Amplify, Cloud Run)

이 문서는 프로젝트의 동적 배포를 위한 절차를 설명합니다. 기본 상태(환경 변수 미설정)에서 동작하며, API Route(`/api/likes`)와 LikeButton의 서버 호출이 정상 지원됩니다. 정적 배포는 `STATIC_DEPLOYMENT_GUIDE.md` 참조. 하나의 소스 코드베이스로 정적/동적을 커버하는 조건부 로직(예: page.tsx SSR 우선, Static CSR fallback)으로 설계되었습니다. 학습자 이해를 위해 에러 원인/해결/테스트를 상세히 설명합니다.

## 1. 공통 설정 요약 (동적 배포용)
기본 빌드(`npm run build`)로 동적 모드. next.config.ts에서 `STATIC_EXPORT` 미설정 시 `output: 'standalone'` (Cloud Run 호환) 활성화.

### next.config.ts
- **동적 모드** (기본): `STATIC_EXPORT` 환경 변수 **미설정** 시 자동 활성화
  - `output: 'standalone'` – 컨테이너 배포 (Cloud Run/Docker 호환)
  - **basePath 없음** – 루트 경로(`/`)에서 배포 (Vercel, Amplify 기본값)
  - SSR, API 라우트, 서버 fetch 모두 지원
- **Static 전환**: `STATIC_EXPORT=true`로 export 모드
  - `basePath: '/next-ts-hands-on'` 자동 추가 (GitHub Pages용)
  - CSR fallback, localStorage
- **✅ 호환성**: 하나의 `next.config.ts`로 정적/동적 자동 전환 (조건부 설정)
- **학습 팁**: env 변경으로 빌드 차이 테스트
  - 동적: `.next/standalone/` 생성, basePath 없음
  - 정적: `out/` 생성, basePath 있음

### package.json
- **기본 스크립트**:
  - `build`: `next build` – 동적 빌드 (.next/, SSR 포함).
  - `start`: `next start` – 프로덕션 서버 (API/SSR 실행).
- 정적 스크립트: Static 가이드 참조.

### src/types/index.ts
- `process.env` 타입 지원: Dynamic API 호출/SSR 시 사용 (TS 증강 수정으로 호환). 학습 팁: 타입 증강으로 env 안전 사용 (IDE 자동완성).

### src/app/components/LikeButton.tsx
- **Dynamic 모드**: API 라우트 호출 (SSR/서버 공유). Static fallback localStorage. 학습 팁: 조건부 if로 하이브리드 이해.

### src/app/page.tsx (포스트 로드 조건부, 대화 문제 해결)
- **Dynamic (ServerHomePage, SSR)**: async fetchPosts() – 서버 데이터 로드, 초기 HTML 포함 (빠른 로딩/SEO).
  - 매 요청 새 fetch (원래 의도 관철).
- **Static fallback (ClientHomePage, CSR)**: import './components/ClientHomePage' – 별도 파일 'use client' + useEffect (revalidate: 0 매 새 데이터).
- **조건부 export**: `isStatic ? ClientHomePage : ServerHomePage` – 빌드 env 전환.
- **효과**: Dynamic SSR 풀 기능, Static CSR 호환 (하나의 소스).
- **학습 팁**: 서버 컴포넌트(SSR)와 클라이언트 import로 분리 – 'use client' 에러 방지, 재사용성. F12 Elements (Dynamic 데이터) vs Network (Static fetch) 비교.

### src/app/components/ClientHomePage.tsx (Static CSR 전용, 에러 해결)
- **'use client' 맨 위**: useState/useEffect 훅 사용 (page.tsx 충돌 방지).
- 로딩/에러: 포스트 목록 또는 fallback.
- **학습 팁**: 클라이언트 파일 분리로 Next.js 규칙 이해 ('use client' 위치, 훅 제한). Dynamic fallback에도 사용 – 하이브리드 예시.

### .env.local
- 환경 변수 (API 키 등). Dynamic 플랫폼(Vercel)에서 입력. 학습 팁: NEXT_PUBLIC_로 클라이언트 노출.

## 2. 하나의 소스로 정적/동적 배포 커버 (대화 종합)
하나의 코드베이스로 빌드 env 전환으로 커버 가능 (Next.js 표준). Dynamic SSR 우선, Static CSR fallback. 학습 팁: 조건부 로직으로 렌더링 차이 이해.

### 방법 상세
- **env 전환**: STATIC_EXPORT=true/false로 config (Dynamic standalone vs Static export).
- **컴포넌트 예**: LikeButton if (isStatic) localStorage else API.
- **페이지 예**: page.tsx 조건부 (Dynamic SSR, Static CSR import + useEffect).
- **자동화**: GitHub Actions – main push: Dynamic Vercel, tag: Static Pages.
- **하이브리드**: API Route Dynamic 전용 (Static fallback).

### 제한
- Static 서버 공유 불가 (CSR 한정).
- 이원화 대안: 브랜치 분리 – 불필요. 학습 팁: 조건부 vs 이원화 (유지보수 vs 격리).

### 구현 팁
- Dynamic: `npm run build` → Vercel (SSR 즉시).
- Static: `npm run build:static` → Pages (CSR 로딩).
- 테스트: Dynamic Elements vs Static Network.

## 3. 테스트 방법 (동적 배포)

### 로컬 동적 모드 테스트
```bash
# 1. 동적 빌드 (환경 변수 없음 = 동적 모드)
npm run build

# 2. 프로덕션 서버 실행
npm run start

# 3. 브라우저에서 확인: http://localhost:3000
```

**확인 사항:**
- ✅ **URL**: `http://localhost:3000` (basePath 없음, 루트 접근)
- ✅ **포스트**: 즉시 표시 (SSR, 로딩 없음)
- ✅ **F12 > Elements**: HTML 소스에 포스트 데이터 포함 확인
- ✅ **API Route**: `/api/likes` 호출 가능 (Console 로그 확인)
- ✅ **LikeButton**: 서버 공유 (새로고침해도 유지)
- ✅ **빌드 결과**: `.next/standalone/` 디렉토리 존재

### Static 비교 (차이점 이해)
| 항목 | 동적 (Dynamic) | 정적 (Static) |
|------|---------------|--------------|
| 명령어 | `npm run build` | `npm run build:static` |
| URL | `/` (루트) | `/next-ts-hands-on/` (basePath) |
| 포스트 로드 | SSR 즉시 | CSR 로딩 후 |
| API Route | ✅ 작동 | ❌ 무시 (localStorage) |
| 빌드 출력 | `.next/standalone/` | `out/` |
| F12 Elements | HTML에 데이터 포함 | 빈 템플릿 |
| F12 Network | 서버 HTML 응답 | 클라이언트 fetch 요청 |

**학습 팁**: 두 모드를 번갈아 빌드하고 F12로 차이 비교 – SSR vs CSR 이해

## 4. 동적 배포 플랫폼 가이드

### Vercel 배포 (추천)

**가장 간단하고 무료인 Next.js 배포 방법**

#### 방법 1: GitHub 연동 (추천)
1. **GitHub 푸시**: 
   ```bash
   git add -A
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Vercel 연동**:
   - https://vercel.com/ 로그인 (GitHub 계정 연동)
   - "New Project" → GitHub 리포지토리 선택
   - "Import" → 자동 감지 (Next.js)
   - **중요**: 환경 변수 입력 **안 함** (동적 모드 기본)
   - "Deploy" 클릭

3. **배포 완료**:
   - URL: `https://your-project.vercel.app/` (루트 경로)
   - 자동 SSL, CDN
   - Git push 시 자동 재배포

#### 방법 2: CLI 배포
```bash
# Vercel CLI 설치 (한 번만)
npm i -g vercel

# 로그인
vercel login

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

#### 확인 사항
- ✅ **URL**: `https://your-project.vercel.app/` (basePath 없음)
- ✅ **포스트**: 즉시 SSR 로드
- ✅ **API**: `/api/likes` 작동 (서버 공유)
- ✅ **CI/CD**: Git push → 자동 배포
- ✅ **무료**: Hobby 플랜 (개인 프로젝트)

#### 문제 해결
- **빌드 실패**: Vercel 대시보드 > Deployments > 로그 확인
- **API 오류**: Functions > Logs 확인
- **환경 변수**: Settings > Environment Variables

### AWS Amplify 배포
- 준비: AWS, GitHub.
- 단계: `amplify init` – amplify.yml (.next/).
- URL: amplifyapp.com – SSR/API.
- 확인: CI/CD, 무료.
- 문제: 콘솔 로그.

### Google Cloud Run 배포
- 준비: gcloud, 프로젝트.
- Dockerfile: standalone.
- 단계: `gcloud builds/deploy`.
- URL: run.app – SSR.
- 확인: 스케일링, 무료.
- 문제: log.

## 5. 주의사항 및 제한 (동적 배포)
- API Route: 풀 지원 (DB 추천).
- 비용: 무료 확인.
- 에러 해결: 로그, Docs.
  - **'use client' 에러 (Static 비교)**: Dynamic SSR OK, Static CSR import 분리.
  - **Bailout/포스트**: Dynamic SSR 즉시, Static CSR fallback (대화 해결).
  - 학습 팁: F12 Elements (SSR 데이터)로 Dynamic 이해.

## 6. 업데이트 로그
- **2025-10-24**: 가이드 생성.
- **2025-10-24**: 하나의 소스 상세.
- **2025-10-24**: page.tsx 조건부, 에러/테스트 보강 (대화 반영).
- **2025-10-24**: ClientHomePage 분리, 'use client' 에러 해결 학습 팁 추가.
- **2025-10-25**: 동적/정적 호환성 검증 완료
  - `next.config.ts` 조건부 설정 확인 (basePath 동적 모드 제외)
  - 로컬 테스트 방법 상세화 (Dynamic vs Static 비교표)
  - Vercel 배포 가이드 상세화 (GitHub 연동, CLI)
  - `.next/standalone/` vs `out/` 빌드 차이 설명

---

## 📋 빠른 시작 (동적 배포)

### 로컬 테스트
```bash
# 동적 빌드
npm run build

# 서버 실행
npm run start

# 확인: http://localhost:3000 (루트 경로)
```

### Vercel 배포 (추천)
```bash
# 1. GitHub 푸시
git push origin main

# 2. Vercel 연동
# https://vercel.com/ → Import Project → GitHub 리포지토리 선택

# 3. 배포 완료
# https://your-project.vercel.app/ (자동 SSL, CDN)
```

### 체크리스트
- [ ] 로컬에서 `npm run build && npm run start` 정상 작동
- [ ] basePath 없음 확인 (`http://localhost:3000/`)
- [ ] SSR 포스트 즉시 표시
- [ ] API Route `/api/likes` 작동
- [ ] Vercel 배포 성공
- [ ] 프로덕션 URL 접속 가능

문제가 발생하면 `npm run build` 출력 및 Vercel 로그를 공유하세요!
