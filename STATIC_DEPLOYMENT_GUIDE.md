# Next.js 정적 배포 가이드 (GitHub Pages 등)

이 문서는 프로젝트의 정적(Static Export) 배포를 위한 변경 사항과 배포 절차를 설명합니다. 기본 상태는 동적 배포를 우선으로 하며, API Route(`/api/likes`)가 정상 동작합니다. 정적 배포는 `STATIC_EXPORT=true`로 조건부 활성화됩니다. 동적 배포 가이드는 `DYNAMIC_DEPLOYMENT_GUIDE.md` 참조. 하나의 소스 코드베이스로 정적/동적을 커버하는 조건부 로직(예: page.tsx SSR/CSR 전환)으로 설계되었습니다. 학습자 이해를 위해 에러 원인/해결/테스트를 상세히 설명합니다.

## 1. 변경된 설정 및 파일 (정적 배포용)

### next.config.ts
- **조건부 Static Export**: `process.env.STATIC_EXPORT === 'true'`일 때 활성화.
  - `output: 'export'`: 빌드 시 정적 파일(out/ 디렉토리) 생성 (서버 코드 제거, CSR 중심).
  - `trailingSlash: true`: GitHub Pages 라우팅 호환 (예: /about/ 접근).
  - `images: { unoptimized: true }`: 이미지 최적화 비활성화 (정적 빌드에서 서버 필요 없음).
- **동적 모드**: 환경 변수 미설정 시 기본 Next.js 동작 (SSR, API 라우트 지원). Dynamic 배포에서 `output: 'standalone'`으로 Cloud Run 호환.
- **빌드 전환**: env 변수로 static/dynamic 전환 – 하나의 소스 커버 (대화 종합). 학습 팁: env 변경 후 빌드 비교로 차이 이해 (out/ vs .next/).

### package.json
- **추가 스크립트** (정적 배포용):
  - `build:static`: `STATIC_EXPORT=true next build` – 정적 빌드 (out/ 생성, bailout 경고 무시 가능).
  - `start:static`: `npx serve out` – 로컬 정적 서버 (serve 글로벌 설치: `npm i -g serve`).
  - `predeploy:static`: `npm run build:static`.
  - `deploy:static`: `gh-pages -d out` – gh-pages 브랜치 푸시 (GitHub Pages 배포).
- **기본 스크립트**: `build`와 `start`는 동적 빌드/서버 (Dynamic 가이드 참조).
- **의존성**: `gh-pages` (^7.0.0) devDependencies에 추가 (정적 배포 자동화).

### src/types/index.ts
- **타입 선언 추가** (process.env 증강 수정, 대화 에러 해결):
  ```typescript
  declare global {
    namespace NodeJS {
      interface ProcessEnv {
        STATIC_EXPORT: string;
        NEXT_PUBLIC_API_URL?: string;  // 정적 모드 외부 API용 (localStorage 대체)
      }
    }
  }

  export {};
  ```
- 기존 `Post` 인터페이스 유지.
- **에러 해결 상세 (학습 팁)**: 이전 `declare module 'process'`로 static 빌드 실패 ('Cannot augment module 'process''). NodeJS 네임스페이스 증강 + `export {};`로 모듈화 – TS 5+/Next.js 16 호환. LikeButton/page.tsx에서 env 타입 안전성 강화 (Dynamic/Static 둘 다). 왜 중요한가? env 변수 타입 체크로 런타임 에러 방지, IDE 자동완성 지원.

### src/app/components/LikeButton.tsx
- **조건부 로직** (하나의 소스 커버 예시):
  - `isStatic = process.env.STATIC_EXPORT === 'true'`.
  - **Dynamic 모드**: API 라우트(`/api/likes`) 호출 (GET/POST, 서버 공유).
  - **Static 모드**: localStorage 사용 (API 무시, 클라이언트 저장/로드).
    - 마운트: `localStorage.getItem('likes_${postId}')` (기본 0).
    - 클릭: +1 후 `setItem` 저장 (콘솔 로그 확인).
    - **주의**: 브라우저 로컬 – 사용자/디바이스별, 서버 공유 불가.
- **호환성**: Dynamic SSR API, Static CSR fallback – 빌드 env 전환으로 커버. 학습 팁: 조건부 if로 서버/클라이언트 분기 이해 (Next.js 하이브리드 렌더링).

### src/app/api/likes/route.ts
- **Static Export 호환 추가** (빌드 에러 해결):
  - `export const dynamic = 'force-static';` – static 빌드 통과 (API 무시되지만 에러 방지).
- 기존 GET/POST 로직: 메모리 Map 저장 (실제 DB/Supabase 연동 추천).
- **Dynamic 전용**: Static에서 무시 – LikeButton fallback으로 보완. 학습 팁: dynamic = 'force-static'은 static 빌드 에러 피하기 위한 플래그 (API는 무시되지만 컴파일 통과).

### src/app/page.tsx (포스트 로드 조건부 구현, 대화 문제 해결)
- **하나의 소스 커버 핵심**: 조건부 export로 Dynamic SSR vs Static CSR 전환.
  - `const isStatic = process.env.STATIC_EXPORT === 'true'; export default isStatic ? ClientHomePage : ServerHomePage;`
  - **Dynamic (ServerHomePage, SSR)**: async fetchPosts() – 서버에서 데이터 로드, 초기 HTML에 포스트 포함 (빠른 로딩/SEO).
  - **Static (ClientHomePage, CSR)**: import './components/ClientHomePage' – 별도 파일 'use client' + useEffect fetch (revalidate: 0 매 새 데이터).
  - 로딩 상태: "포스트를 불러오는 중..." (UX 개선).
  - Fallback: 서버 fetch 실패 시 ClientHomePage (안전).
- **효과**: Static 포스트 로드 성공 (이전 서버 fetch 무시 문제 해결). Dynamic 원래 의도 (SSR 매 요청 새 데이터) 관철.
- **학습 팁**: 서버 컴포넌트(SSR)와 클라이언트 컴포넌트(CSR) 분리로 에러 피함 ('use client' 위치 문제 해결). import로 공유 – 하나의 소스 유지하면서 모듈화. 빌드 시 env 체크로 자동 전환 이해.

### src/app/components/ClientHomePage.tsx (새 파일, Static CSR 전용)
- **'use client' 맨 위 배치**: useState/useEffect 훅 사용 가능 (page.tsx 에러 해결).
- fetchPosts(): revalidate: 0으로 매 로드 새 데이터 (GitHub Pages 브라우저 fetch).
- 로딩/에러 핸들링: 포스트 목록 표시 또는 fallback.
- **학습 팁**: 클라이언트 컴포넌트를 별도 파일로 분리 – 서버 파일(page.tsx)에서 import. 왜? 'use client' 충돌 방지, 코드 재사용성 높임 (Dynamic fallback에도 사용).

### .env.local (사용자 직접 생성 필요)
- 프로젝트 루트에 생성:
  ```
  NEXT_PUBLIC_API_URL=https://your-external-api.com  # Static 외부 API (localStorage 대체, CORS 확인)
  ```
- git 무시. Static에서 외부 API fetch 시 사용 (jsonplaceholder처럼 공개 API OK). 학습 팁: NEXT_PUBLIC_ prefix로 클라이언트 노출 (빌드 시 번들링).

## 2. 테스트 방법 (정적 배포)

### 로컬 정적 모드 (GitHub Pages 시뮬레이션)
1. `npm run build:static` – out/ 생성 (bailout 경고 무시, 성공 확인).
2. `npm run start:static` – http://localhost:3000.
3. LikeButton: F12 > Application > Local Storage (저장/로드 확인).
4. **page.tsx 포스트 로드** (CSR): 로딩 후 목록 표시. F12 > Network > "posts" fetch (200 OK, 5개 데이터). 새로고침: 매번 새 fetch (revalidate: 0).
   - 실패 시: Console 에러 ("Failed to fetch" – API/네트워크 확인). 학습 팁: Network 탭으로 CSR fetch 흐름 이해 (브라우저 직접 호출).
5. about/: 즉시 정적 로드 (fetch 없음).

### 로컬 동적 모드 (비교, Dynamic 가이드 참조)
1. `npm run build && npm run start` – http://localhost:3000.
2. page.tsx: 로딩 없이 즉시 포스트 (SSR, F12 > Elements HTML에 데이터 포함). 학습 팁: Elements 소스로 SSR vs Network CSR 비교.
3. LikeButton: API 호출 (콘솔 로그).

## 3. GitHub Pages 배포 절차
1. GitHub repo 준비: `git init/add/commit/push main`.
2. `npm run deploy:static` – gh-pages 푸시.
3. Settings > Pages > Source: gh-pages.
4. URL 확인: 루트 – CSR fetch 포스트 로드 (Network 탭). about/ – 정적. 학습 팁: 배포 후 F12로 CSR 동작 확인 (fetch 요청).

## 4. 하나의 소스로 정적/동적 배포 커버 (대화 종합)
하나의 코드베이스로 빌드 env 전환으로 커버 가능 (Next.js 표준). 완전 동시 불가하지만, 조건부 로직으로 실질 지원. 학습 팁: env 변수로 빌드 차이 이해 (Static CSR vs Dynamic SSR).

### 방법 상세
- **env 전환**: STATIC_EXPORT=true/false로 next.config.ts (export vs standalone).
- **컴포넌트 예**: LikeButton if (isStatic) localStorage else API (Dynamic 서버 공유).
- **페이지 예**: page.tsx 조건부 export (Dynamic SSR fetch, Static CSR useEffect + 로딩). ClientHomePage 별도 파일로 'use client' 분리 (에러 방지).
- **자동화**: GitHub Actions (.github/workflows) – main push: Dynamic Vercel, tag: Static Pages.
- **하이브리드**: API Route Dynamic 전용 (Static fallback localStorage/외부 fetch).
- **학습 팁**: 조건부 export로 서버/클라이언트 분기 – 빌드 시 자동 선택 (하나의 소스 유지, 모듈화 이점).

### 제한
- Static 서버 공유 불가 (CSR 한정, 공유 데이터 제한).
- 이원화 대안: 브랜치 분리 (main Dynamic, static-branch) – 불필요 (현재 충분). 학습 팁: 조건부 vs 이원화 비교 (조건부: 간단 유지보수, 이원화: 기능 격리).

### 구현 팁
- Dynamic: `npm run build` → Vercel (SSR 포스트 즉시).
- Static: `npm run build:static` → Pages (CSR 포스트 로딩 후).
- 테스트: 빌드 비교 (out/ CSR vs .next/ SSR). F12 Elements (Dynamic HTML 데이터) vs Network (Static fetch).

## 5. 주의사항 및 제한 (정적 배포)
- API Route: Static 무시 (localStorage 대체).
- 동적 기능: 서버 코드 에러 – 클라이언트 이동.
- 라우팅: 파일 기반 (about/page.tsx OK).
- 이미지: public/ out/ 복사.
- 보안: localStorage 클라이언트만.
- 대안: 외부 API/BaaS fetch.
- **에러 해결 상세** (대화 종합, 학습자 이해 위해):
  - **TS process.env 에러**: 원인 `declare module 'process'` (모듈 증강 실패). 해결 NodeJS.ProcessEnv + export {}. 영향 타입 안전. 팁: IDE 자동완성으로 env 사용 연습.
  - **Build Bailout (fetch revalidate: 0)**: 원인 동적 fetch (정적 포기). 해결 CSR useEffect (GitHub Pages 브라우저 fetch 지원). 영향 CSR 동작, 매 새 데이터 (실시간 좋음). 팁: 빌드 로그 무시하고 out/ 확인.
  - **API Route 에러**: 원인 static에서 서버 필요. 해결 `dynamic = 'force-static'`. 영향 빌드 통과, Static 무시. 팁: Dynamic에서만 API 테스트.
  - **'use client' 지시어 에러 (page.tsx)**: 원인 파일 중간 배치/훅 충돌 (서버 컴포넌트에서 useState/useEffect). 해결 ClientHomePage 별도 파일 ('use client' 맨 위) + import 조건부 export. 영향 Static CSR 성공, Dynamic SSR 유지. 학습 팁: 서버/클라이언트 분리로 Next.js 하이브리드 이해 – import로 재사용.
  - **포스트 로드 실패 (page.tsx)**: 원인 서버 fetch 무시. 해결 조건부 CSR/SSR (ClientHomePage useEffect). 영향 Static CSR 로드, Dynamic SSR 즉시. 팁: F12 Network (Static fetch) vs Elements (Dynamic HTML).

## 6. 업데이트 로그
- **2025-10-24**: Static export, localStorage 추가.
- **2025-10-24**: 동적 분리, 재구성.
- **2025-10-24**: TS 에러 해결.
- **2025-10-24**: API dynamic 추가, bailout/CSR 설명.
- **2025-10-24**: page.tsx 조건부 SSR/CSR, 포스트 로드 해결, 하나의 소스 커버 상세 (대화 종합).
- **2025-10-24**: 'use client' 에러 해결 (ClientHomePage 분리), 에러 섹션 학습 팁 추가 (대화 반영).

문제가 발생하면 `npm run build:static` 출력 공유하세요!
