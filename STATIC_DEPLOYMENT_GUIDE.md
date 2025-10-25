# Next.js 정적 배포 가이드 (GitHub Pages 등)

이 문서는 프로젝트의 정적(Static Export) 배포를 위한 변경 사항과 배포 절차를 설명합니다. 기본 상태는 동적 배포를 우선으로 하며, API Route(`/api/likes`)가 정상 동작합니다. 정적 배포는 `STATIC_EXPORT=true`로 조건부 활성화됩니다. 동적 배포 가이드는 `DYNAMIC_DEPLOYMENT_GUIDE.md` 참조. 하나의 소스 코드베이스로 정적/동적을 커버하는 조건부 로직(예: page.tsx SSR/CSR 전환)으로 설계되었습니다. 학습자 이해를 위해 에러 원인/해결/테스트를 상세히 설명합니다.

## 1. 변경된 설정 및 파일 (정적 배포용)

### next.config.ts
- **조건부 Static Export**: `process.env.STATIC_EXPORT === 'true'`일 때 활성화.
  - `output: 'export'`: 빌드 시 정적 파일(out/ 디렉토리) 생성 (서버 코드 제거, CSR 중심).
  - **`basePath: '/next-ts-hands-on'`**: GitHub Pages의 리포지토리 경로 설정 (**필수**). 
  - **`assetPrefix: '/next-ts-hands-on'`**: 정적 자원(_next/, CSS, JS 등) 경로 접두사 (basePath와 동일하게 설정).
  - `trailingSlash: true`: GitHub Pages 라우팅 호환 (예: /about/ 접근).
  - `images: { unoptimized: true }`: 이미지 최적화 비활성화 (정적 빌드에서 서버 필요 없음).
- **동적 모드**: 환경 변수 미설정 시 기본 Next.js 동작 (SSR, API 라우트 지원). Dynamic 배포에서 `output: 'standalone'`으로 Cloud Run 호환.
- **빌드 전환**: env 변수로 static/dynamic 전환 – 하나의 소스 커버 (대화 종합). 학습 팁: env 변경 후 빌드 비교로 차이 이해 (out/ vs .next/).
- **⚠️ 중요**: basePath와 assetPrefix를 **본인의 리포지토리 이름**으로 변경해야 함. 예: 리포지토리가 `my-app`이면 `basePath: '/my-app'`.

#### 🔑 basePath/assetPrefix가 필수인 이유

**GitHub Pages URL 구조:**
```
https://username.github.io/repo-name/
                          └───┬───┘
                          이 부분이 문제!
```

**basePath 없으면 404 에러 발생:**
```
❌ 브라우저가 찾는 경로:
   https://joosung80.github.io/_next/static/css/app.css
                               ↑ 루트(/)에서 찾음

✅ 실제 파일 위치:
   https://joosung80.github.io/next-ts-hands-on/_next/static/css/app.css
                               └──────┬──────┘
                                 누락된 부분 → 404!
```

**basePath 설정 후:**
```
✅ Next.js가 HTML 생성:
   <script src="/next-ts-hands-on/_next/static/chunks/main.js">
                └──────┬──────┘
            자동으로 prefix 추가!

✅ 브라우저 요청 = 실제 위치:
   https://joosung80.github.io/next-ts-hands-on/_next/static/chunks/main.js
   경로 일치! → 200 OK
```

**언제 필요한가?**
- ✅ **필수**: `username.github.io/repo-name/` (프로젝트 사이트)
- ❌ **불필요**: `username.github.io/` (개인 사이트, 리포명: username.github.io)
- ❌ **불필요**: Vercel, Netlify 등 루트 도메인 배포

**Next.js 공식 문서:** [basePath](https://nextjs.org/docs/app/api-reference/next-config-js/basePath) - "To deploy a Next.js application under a **sub-path** of a domain"

### package.json
- **추가 스크립트** (정적 배포용):
  - `build:static`: `STATIC_EXPORT=true next build` – 정적 빌드 (out/ 생성, bailout 경고 무시 가능).
  - `start:static`: `npx serve out` – 로컬 정적 서버 (serve 글로벌 설치: `npm i -g serve`).
  - `predeploy:static`: `npm run build:static`.
  - **`deploy:static`: `gh-pages -d out -t`** – gh-pages 브랜치 푸시. **`-t` 옵션 필수** (dot 파일 포함, `.nojekyll` 배포 위해 필요).
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

### public/.nojekyll (필수 파일)
- **`public/.nojekyll` 파일 생성** (빈 파일):
  ```bash
  touch public/.nojekyll
  ```
- **왜 필요한가?**: GitHub Pages는 기본적으로 Jekyll을 사용하는데, Jekyll은 `_`로 시작하는 디렉토리(`_next` 등)를 무시함. `.nojekyll` 파일이 있으면 Jekyll을 비활성화하여 `_next` 디렉토리가 정상 작동.
- **자동 복사**: Next.js가 빌드 시 `public/` 내용을 `out/`으로 자동 복사. `package.json`의 `-t` 옵션으로 gh-pages 브랜치에 배포됨.
- **학습 팁**: 이 파일 없으면 모든 JS/CSS 파일이 404 에러 발생 (포스트/스타일 안 보임). 가장 흔한 GitHub Pages 배포 오류.

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

### 초기 설정 (한 번만)
1. **리포지토리 이름 확인**: 예) `next-ts-hands-on`
2. **`next.config.ts` 수정**: `basePath`와 `assetPrefix`를 리포지토리 이름으로 변경
   ```typescript
   basePath: '/next-ts-hands-on',  // ← 본인의 리포지토리 이름
   assetPrefix: '/next-ts-hands-on',
   ```
3. **`public/.nojekyll` 파일 생성**:
   ```bash
   touch public/.nojekyll
   ```
4. **GitHub repo 준비**: 
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/username/repo-name.git
   git push -u origin main
   ```

### 배포 (매번)
1. **배포 실행**:
   ```bash
   npm run deploy:static
   ```
   - 자동으로 빌드 → gh-pages 브랜치 푸시
   
2. **GitHub Pages 활성화** (최초 1회):
   - GitHub 리포지토리 > Settings > Pages
   - Source: `gh-pages` 브랜치 선택
   - Save

3. **배포 확인** (1-2분 대기 후):
   - GitHub Actions: `https://github.com/username/repo-name/actions`
     - ✅ 녹색 체크: 배포 성공
     - ❌ 빨간 X: 에러 확인
   - **실제 사이트**: `https://username.github.io/repo-name/`
     - F12 > Console: 에러 없는지 확인
     - F12 > Network: JS/CSS 파일 200 OK 확인
     - 포스트 5개 정상 표시
     - 좋아요 버튼 작동 테스트

### 🔍 배포 후 체크리스트
- [ ] GitHub Actions 녹색 체크마크
- [ ] 사이트 접속 가능
- [ ] Console 에러 없음 (404 에러 특히 주의)
- [ ] 포스트 5개 로드됨
- [ ] 좋아요 버튼 작동 (localStorage)
- [ ] About 페이지 이동 가능

### ⚠️ 문제 발생 시
- **404 에러 (JS/CSS)**: `.nojekyll` 파일 확인, `-t` 옵션 확인
- **빈 페이지**: basePath 설정 확인
- **포스트 안 보임**: Console 에러 확인, API 호출 상태 확인

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

## 5. Dynamic Routes (참고용)

현재 프로젝트는 Static Routes만 사용하므로 불필요하지만, 블로그처럼 Dynamic Routes를 사용하는 경우 `generateStaticParams`가 필요합니다.

### Dynamic Routes 예시 (`[...slug]` 등 사용 시)

```typescript
// app/post/[...slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getAllPosts();
  
  return posts.map(post => ({
    slug: post.slug.split('/'),
  }));
}

export default function PostPage({ params }: { params: { slug: string[] } }) {
  // 포스트 렌더링
}
```

**왜 필요한가?**
- Static Export 시 Dynamic Routes는 빌드 타임에 미리 생성되어야 함
- `generateStaticParams`로 모든 가능한 경로를 Next.js에 알려줌
- 런타임에 동적 생성 불가 (SSR 없음)

**현재 프로젝트**:
- ✅ `/` (홈)
- ✅ `/about` (소개)
- ❌ Dynamic Routes 없음 → `generateStaticParams` 불필요

**참고**: [Next.js 공식 문서 - generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)

---

## 6. 주의사항 및 제한 (정적 배포)
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
  - **🔥 GitHub Pages 404 에러 (JS/CSS/포스트 안 보임)**: **가장 흔한 배포 오류**
    - **현상**: 배포 성공했지만 빈 페이지, Console에 404 에러 다수, 포스트 안 보임, 스타일 깨짐
    
    - **원인 1 - Jekyll `_next` 무시**: 
      - GitHub Pages가 기본적으로 Jekyll 사용
      - Jekyll은 `_`로 시작하는 디렉토리(`_next`, `_app` 등)를 무시
      - 모든 JS/CSS 파일이 404 에러
    - **해결 1**: `public/.nojekyll` 파일 생성 (Jekyll 비활성화)
    
    - **원인 2 - `.nojekyll` 배포 안 됨**: 
      - `gh-pages` 패키지가 dot 파일(`.`로 시작)을 기본 무시
      - `.nojekyll`이 gh-pages 브랜치에 업로드 안 됨
    - **해결 2**: `package.json`의 `deploy:static`에 `-t` 옵션 추가 (`gh-pages -d out -t`)
    
    - **원인 3 - basePath 누락 (경로 불일치)**:
      ```
      배포 URL:  username.github.io/repo-name/
      Next.js:   /_next/static/... (루트에서 찾음)
      브라우저:  username.github.io/_next/static/... (404!)
      실제 위치: username.github.io/repo-name/_next/static/... (여기 있음)
                                     └─────┬─────┘
                                     누락된 부분!
      ```
    - **해결 3**: `next.config.ts`에 `basePath`와 `assetPrefix` 추가 (리포지토리 이름과 일치)
      ```typescript
      basePath: '/repo-name',
      assetPrefix: '/repo-name',
      ```
    
    - **검증 방법**:
      1. `git ls-tree --name-only origin/gh-pages | grep nojekyll` → `.nojekyll` 확인
      2. 브라우저에서 `https://username.github.io/repo-name/_next/static/chunks/xxx.js` 직접 접속 → 404면 Jekyll 문제
      3. F12 Console → 404 에러 없어야 함
      4. F12 Network → 모든 자원 200 OK
    
    - **학습 팁**: 
      - GitHub Pages 배포 시 가장 많이 겪는 3대 문제
      - Actions 성공(✅) ≠ 사이트 정상 동작 (반드시 브라우저 확인!)
      - 세 가지 문제가 모두 해결되어야 정상 작동
      - **basePath는 경로 일치를 위한 핵심 설정!**

## 7. 업데이트 로그
- **2025-10-24**: Static export, localStorage 추가.
- **2025-10-24**: 동적 분리, 재구성.
- **2025-10-24**: TS 에러 해결.
- **2025-10-24**: API dynamic 추가, bailout/CSR 설명.
- **2025-10-24**: page.tsx 조건부 SSR/CSR, 포스트 로드 해결, 하나의 소스 커버 상세 (대화 종합).
- **2025-10-24**: 'use client' 에러 해결 (ClientHomePage 분리), 에러 섹션 학습 팁 추가 (대화 반영).
- **2025-10-25**: GitHub Pages 404 에러 해결 (Jekyll `_next` 무시 문제)
  - `public/.nojekyll` 파일 추가
  - `package.json`에 `-t` 옵션 추가 (dot 파일 배포)
  - `next.config.ts`에 `basePath`/`assetPrefix` 추가
  - 배포 절차 상세화 (체크리스트, 검증 방법)
  - GitHub Pages 404 에러 해결 섹션 추가 (가장 흔한 문제)
- **2025-10-25**: 외부 참고 문서와 비교 검증
  - Dynamic Routes 참고 섹션 추가 (`generateStaticParams`)
  - `.nojekyll` 관리 방식 우수성 확인 (public/ 자동 복사)
  - `basePath`/`assetPrefix` 설정 정확성 확인
  - 조건부 배포 지원 (정적/동적 자동 전환) 장점 확인
- **2025-10-25**: basePath/assetPrefix 상세 설명 추가
  - URL 구조 시각적 비교 (404 에러 vs 정상 작동)
  - 경로 불일치 원리 설명 (브라우저 vs 실제 위치)
  - 언제 필요/불필요한지 명확한 기준 제시
  - Next.js 공식 문서 링크 추가
  - 404 에러 섹션에 경로 불일치 상세 설명 추가

---

## 📋 빠른 시작 (GitHub Pages 배포)

### 1. 필수 파일 설정
```bash
# .nojekyll 생성
touch public/.nojekyll

# next.config.ts 수정 (리포지토리 이름으로 변경)
# basePath: '/your-repo-name',
# assetPrefix: '/your-repo-name',
```

### 2. 배포
```bash
npm run deploy:static
```

### 3. 확인
- GitHub Actions: ✅ 체크
- 사이트: https://username.github.io/repo-name/
- Console: 에러 없음
- 포스트: 5개 표시

문제가 발생하면 `npm run build:static` 출력 및 브라우저 Console 에러를 공유하세요!
