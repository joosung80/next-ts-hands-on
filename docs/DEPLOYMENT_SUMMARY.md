# 배포 옵션 요약 (하나의 리포지토리, 두 가지 배포 방식)

이 프로젝트는 **하나의 소스 코드**로 **정적 배포**와 **동적 배포**를 모두 지원합니다.

---

## 🎯 핵심 개념

### 조건부 설정 (`next.config.ts`)

```typescript
const isStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig: NextConfig = {
  // 정적 배포 (GitHub Pages)
  ...(isStaticExport && {
    output: 'export',
    basePath: '/next-ts-hands-on',
    assetPrefix: '/next-ts-hands-on',
    trailingSlash: true,
    images: { unoptimized: true },
  }),
  
  // 동적 배포 (Vercel, AWS Amplify, Cloud Run)
  ...(!isStaticExport && {
    output: 'standalone',
  }),
};
```

**결과**: 환경 변수 하나로 완전히 다른 빌드 생성!

---

## 📊 배포 방식 비교

| 항목 | 정적 배포 (Static) | 동적 배포 (Dynamic) |
|------|-------------------|-------------------|
| **명령어** | `npm run build:static` | `npm run build` |
| **환경 변수** | `STATIC_EXPORT=true` | 없음 (기본값) |
| **배포 대상** | GitHub Pages | Vercel, Amplify, Cloud Run |
| **URL 형식** | `/repo-name/` (basePath) | `/` (루트) |
| **렌더링** | CSR (Client-Side) | SSR (Server-Side) |
| **포스트 로드** | 로딩 후 표시 | 즉시 표시 |
| **API Route** | ❌ 무시 (localStorage) | ✅ 작동 (서버 공유) |
| **빌드 출력** | `out/` | `.next/standalone/` |
| **호스팅 비용** | 무료 | 무료 (Hobby/Free tier) |
| **배포 속도** | 느림 (gh-pages 푸시) | 빠름 (자동 배포) |
| **SEO** | ❌ CSR 한계 | ✅ SSR 최적화 |
| **장점** | 간단, GitHub 통합 | 빠름, API 지원, SSR |

---

## 🚀 배포 방법

### 1️⃣ 정적 배포 (GitHub Pages)

```bash
# 1. .nojekyll 생성 (Jekyll 비활성화)
touch public/.nojekyll

# 2. next.config.ts 수정
# basePath: '/your-repo-name',
# assetPrefix: '/your-repo-name',

# 3. 배포
npm run deploy:static

# 4. 확인
# https://username.github.io/repo-name/
```

**상세 가이드**: `STATIC_DEPLOYMENT_GUIDE.md`

---

### 2️⃣ 동적 배포 (Vercel - 추천)

```bash
# 1. GitHub 푸시
git push origin main

# 2. Vercel 연동
# https://vercel.com/ → Import Project

# 3. 자동 배포 완료
# https://your-project.vercel.app/
```

**상세 가이드**: `DYNAMIC_DEPLOYMENT_GUIDE.md`

---

## ✅ 호환성 검증

### 현재 리포지토리 상태: **완벽하게 호환 가능** ✅

| 체크 항목 | 상태 | 설명 |
|----------|------|------|
| `next.config.ts` 조건부 설정 | ✅ | basePath가 정적 모드만 적용 |
| `public/.nojekyll` | ✅ | Jekyll 비활성화 파일 존재 |
| `package.json` `-t` 옵션 | ✅ | dot 파일 배포 가능 |
| 동적 빌드 테스트 | ✅ | `.next/standalone/` 생성 확인 |
| 정적 빌드 테스트 | ✅ | `out/` 생성 확인 |
| basePath 분리 | ✅ | 동적: 없음, 정적: `/repo-name/` |

---

## 🎓 학습 포인트

### 1. 조건부 설정의 힘
- **하나의 소스 코드**로 완전히 다른 두 가지 배포 방식 지원
- 환경 변수 하나로 SSR ↔ CSR 전환
- 유지보수 간편 (코드 중복 없음)

### 2. basePath의 역할
- **정적**: GitHub Pages는 `/repo-name/` 경로 사용 → basePath 필수
- **동적**: Vercel은 루트(`/`) 경로 사용 → basePath 불필요
- 조건부 설정으로 자동 처리

### 3. Jekyll 문제 (GitHub Pages만)
- GitHub Pages는 기본적으로 Jekyll 사용
- Jekyll은 `_next` 디렉토리를 무시
- `.nojekyll` 파일로 해결
- **동적 배포에서는 이 문제 없음**

---

## 🔄 배포 시나리오

### 시나리오 1: 개인 포트폴리오 (무료)
```bash
# GitHub Pages로 정적 배포
npm run deploy:static
# → https://username.github.io/portfolio/
```

### 시나리오 2: 프로덕션 앱 (API 필요)
```bash
# Vercel로 동적 배포
git push origin main
# → https://my-app.vercel.app/
```

### 시나리오 3: 둘 다 사용
```bash
# 1. 데모용: GitHub Pages (정적)
npm run deploy:static
# → https://username.github.io/demo/

# 2. 실제 앱: Vercel (동적)
git push origin main
# → https://my-app.vercel.app/
```

---

## 🧪 로컬 테스트

### 정적 모드 테스트
```bash
npm run build:static
npm run start:static
# → http://localhost:3000 (serve로 실행)
```

### 동적 모드 테스트
```bash
npm run build
npm run start
# → http://localhost:3000 (Next.js 서버)
```

### 차이 확인
```bash
# 1. 정적 빌드
npm run build:static
ls out/  # → HTML, CSS, JS 파일들

# 2. 동적 빌드
npm run build
ls .next/standalone/  # → 서버 코드 포함
```

---

## 📝 체크리스트

### 정적 배포 준비
- [ ] `public/.nojekyll` 파일 존재
- [ ] `next.config.ts`에 basePath 설정 (리포지토리 이름)
- [ ] `package.json`에 `-t` 옵션
- [ ] `npm run build:static` 성공
- [ ] GitHub Pages 활성화

### 동적 배포 준비
- [ ] `npm run build` 성공
- [ ] `npm run start`로 로컬 테스트
- [ ] basePath 없음 확인 (`/`)
- [ ] API Route 작동 확인
- [ ] Vercel 계정 준비

---

## 🎉 결론

✅ **현재 리포지토리는 정적/동적 배포 모두 완벽하게 지원합니다!**

- **정적 배포**: `npm run deploy:static` → GitHub Pages
- **동적 배포**: `git push` → Vercel (자동 배포)
- **조건부 설정**: 환경 변수 하나로 자동 전환
- **유지보수**: 하나의 소스 코드, 중복 없음

**상세 가이드 참조**:
- 정적 배포: `STATIC_DEPLOYMENT_GUIDE.md`
- 동적 배포: `DYNAMIC_DEPLOYMENT_GUIDE.md`

---

## 🆘 문제 해결

### GitHub Pages에서 404 에러
→ `STATIC_DEPLOYMENT_GUIDE.md` 섹션 5 참조

### Vercel 빌드 실패
→ `DYNAMIC_DEPLOYMENT_GUIDE.md` 섹션 4 참조

### 둘 다 안 됨
→ `npm run build` 및 `npm run build:static` 출력 공유

