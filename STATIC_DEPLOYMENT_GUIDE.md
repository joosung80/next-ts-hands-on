# Next.js 정적 배포 지원 가이드 (GitHub Pages 등)

이 문서는 프로젝트의 동적/정적 배포 유연성을 위한 변경 사항과 배포 절차를 설명합니다. Next.js App Router 기반 프로젝트에서 `STATIC_EXPORT=true` 환경 변수를 통해 정적 export를 활성화하여 GitHub Pages 같은 정적 호스팅 서비스에 배포할 수 있습니다.

## 1. 변경된 설정 및 파일

### next.config.ts
- **조건부 Static Export**: `process.env.STATIC_EXPORT === 'true'`일 때 활성화.
  - `output: 'export'`: 빌드 시 정적 파일(out/ 디렉토리) 생성.
  - `trailingSlash: true`: GitHub Pages 라우팅 호환.
  - `images: { unoptimized: true }`: 이미지 최적화 비활성화 (정적 빌드 필요).
- **동적 모드**: 환경 변수 미설정 시 기본 Next.js 동작 (SSR, API 라우트 지원).

### package.json
- **추가 스크립트**:
  - `build:static`: `STATIC_EXPORT=true next build` – 정적 빌드.
  - `start:static`: `npx serve out` – 로컬 정적 서버 (serve 글로벌 설치 필요: `npm i -g serve`).
  - `predeploy:static`: `npm run build:static`.
  - `deploy:static`: `gh-pages -d out` – gh-pages 브랜치로 푸시 (gh-pages 패키지 설치됨).
- **의존성**: `gh-pages` (^7.0.0) devDependencies에 추가.

### src/types/index.ts
- **타입 선언 추가**:
  ```typescript
  declare module 'process' {
    export interface Env {
      STATIC_EXPORT: string;
      NEXT_PUBLIC_API_URL?: string;  // 정적 모드 외부 API용 (현재 localStorage로 대체)
    }
  }
  ```
- 기존 `Post` 인터페이스 유지.

### src/app/components/LikeButton.tsx
- **조건부 로직**: `isStatic = process.env.STATIC_EXPORT === 'true'`.
  - **동적 모드**: 기존 API 라우트(`/api/likes`) 호출 (GET/POST).
  - **정적 모드**: localStorage 사용.
    - 마운트 시: `localStorage.getItem(\`likes_${postId}\`)`으로 좋아요 수 로드 (기본 0).
    - 클릭 시: 좋아요 +1, `localStorage.setItem(\`likes_${postId}\`, newLikes.toString())`으로 저장.
    - **주의**: localStorage는 브라우저 로컬 저장소이므로 사용자별/디바이스별 데이터. 서버 공유 불가.
- API URL 조건부 제거 (localStorage로 전환됨). 외부 API 필요 시 `NEXT_PUBLIC_API_URL` 사용 가능.

### .env.local (사용자 직접 생성 필요)
- 프로젝트 루트에 생성:
  ```
  NEXT_PUBLIC_API_URL=https://your-external-api.com  # 정적 모드 외부 API (현재 미사용, localStorage 우선)
  ```
- git에 커밋되지 않음. localStorage 대체로 이 설정은 옵션.

## 2. 테스트 방법

### 동적 모드 (Vercel 등 서버 호스팅)
1. `npm run dev` – 개발 서버: http://localhost:3000.
2. `npm run build && npm run start` – 프로덕션 서버.
3. LikeButton 테스트: API 호출 확인 (브라우저 콘솔).

### 정적 모드 (GitHub Pages 시뮬레이션)
1. `npm run build:static` – out/ 디렉토리 생성 (에러 확인).
2. `npm run start:static` – 로컬 정적 서버: http://localhost:3000 (포트 확인).
3. LikeButton 테스트: localStorage 확인 (F12 > Application > Local Storage). 새로고침 시 데이터 유지.
   - about/ 페이지나 PostItem.tsx에서 LikeButton 사용 시 동일 적용.

## 3. GitHub Pages 배포 절차
1. **GitHub 리포지토리 준비**:
   - 새 repo 생성 (예: `next-ts-hands-on`).
   - `git init`, `git add .`, `git commit -m "Initial commit"`, `git remote add origin https://github.com/username/repo.git`, `git push -u origin main`.

2. **배포 실행**:
   - `npm run deploy:static` – out/ 내용이 gh-pages 브랜치로 푸시.
   - GitHub Settings > Pages > Source: "Deploy from a branch" > Branch: "gh-pages".

3. **사이트 확인**:
   - URL: `https://username.github.io/repo` (예: /about/ 접근).
   - API 라우트 무시됨 (localStorage로 대체).

## 4. 주의사항 및 제한
- **API 라우트 (`src/app/api/likes/route.ts`)**: 정적 모드에서 무시됨. localStorage로 클라이언트 전용 기능 대체.
- **동적 기능**: SSR, getServerSideProps 등 서버 코드 있으면 정적 빌드 에러 발생. 클라이언트 컴포넌트로 이동.
- **라우팅**: 동적 라우트([slug])는 파일 기반으로 변환. about/page.tsx처럼 정적 페이지 OK.
- **이미지/자산**: public/ 폴더 out/에 복사. 큰 파일 최적화.
- **보안**: localStorage는 클라이언트만 접근. 민감 데이터 피함.
- **대안**: 외부 API (Vercel/Netlify)나 BaaS (Supabase) 사용 시 localStorage 대신 fetch로 변경.
- **에러 해결**: 빌드 에러 시 Next.js 문서 참조 (https://nextjs.org/docs/app/building-your-application/deploying/static-exports). 콘솔 로그 확인.

## 5. 업데이트 로그
- **2025-10-24**: Static export 조건부 설정, localStorage 로직 추가.
- 추가 변경 필요 시 이 파일 업데이트.

문제가 발생하면 `npm run build:static` 출력 공유하세요!
