# next.config.ts Static Export 설정 완벽 해석

## 📍 위치: next.config.ts (7-11번 라인)

```typescript
...(isStaticExport && {
  output: 'export',                    // 라인 7
  basePath: '/next-ts-hands-on',       // 라인 8
  assetPrefix: '/next-ts-hands-on',    // 라인 9
  trailingSlash: true,                 // 라인 10
  images: { unoptimized: true },       // 라인 11
}),
```

---

## 🔍 각 설정의 의미와 영향

### 1️⃣ `output: 'export'` (라인 7)

#### 📌 의미
```typescript
output: 'export'
```
Next.js를 **완전한 정적 사이트**로 빌드합니다.

#### 🔬 빌드 타임에 일어나는 일

```bash
npm run build:static
```

**일반 빌드 (output 없음):**
```
.next/
├── server/          # Node.js 서버 코드
│   ├── app/
│   └── pages/
├── static/          # 정적 파일
└── standalone/      # 독립 실행 파일
```

**Static Export (output: 'export'):**
```
out/                 # 정적 HTML/CSS/JS만
├── index.html       # / 경로
├── about.html       # /about 경로
├── _next/
│   └── static/      # CSS, JS 번들
└── (서버 코드 없음!)
```

#### ⚙️ 동작 방식

```typescript
// Next.js 내부 로직 (의사코드)
if (config.output === 'export') {
  // 1. 모든 페이지를 HTML로 프리렌더링
  pages.forEach(page => {
    const html = renderToStaticHTML(page);
    writeFile(`out/${page}.html`, html);
  });
  
  // 2. 서버 코드 제거
  removeServerCode();
  
  // 3. API Routes 무시
  ignoreAPIRoutes();
  
  // 4. 정적 자원만 복사
  copyStaticAssets('out/_next/static/');
}
```

#### 📊 영향

| 항목 | 효과 |
|------|------|
| **페이지** | 모두 HTML로 사전 생성 |
| **API Routes** | 빌드에서 제외 (무시) |
| **서버 코드** | 완전 제거 |
| **이미지 최적화** | 비활성화 필요 |
| **동적 라우팅** | `generateStaticParams` 필요 |
| **배포** | 정적 호스팅 가능 (GitHub Pages, S3 등) |

#### 🚫 제한사항

```typescript
// ❌ 사용 불가
export const dynamic = 'force-dynamic';  // 빌드 에러!
export const revalidate = 60;            // 무시됨

// ❌ 지원 안 됨
- Server Actions
- Middleware (일부 기능)
- Image Optimization (자동)
- Incremental Static Regeneration (ISR)

// ✅ 사용 가능
- Static Pages
- Client Components
- Static Assets
- Client-side Routing
```

---

### 2️⃣ `basePath: '/next-ts-hands-on'` (라인 8)

#### 📌 의미
```typescript
basePath: '/next-ts-hands-on'
```
앱의 **기본 URL 경로**를 설정합니다.

#### 🌐 왜 필요한가?

**GitHub Pages URL 구조:**
```
일반 웹사이트:
https://example.com/          ← 루트(/)에서 시작

GitHub Pages (프로젝트 사이트):
https://username.github.io/next-ts-hands-on/  ← 서브 경로!
                           └───────┬───────┘
                           리포지토리 이름
```

#### 🔄 basePath의 효과

**basePath 없으면:**
```html
<!-- Next.js가 생성한 HTML -->
<script src="/_next/static/chunks/main.js"></script>
<link href="/_next/static/css/app.css" />
<a href="/about">About</a>

<!-- 브라우저 요청 -->
GET https://username.github.io/_next/static/chunks/main.js
                               ↑
                           404 Not Found!
                           (파일 위치: /next-ts-hands-on/_next/...)
```

**basePath 있으면:**
```html
<!-- Next.js가 생성한 HTML -->
<script src="/next-ts-hands-on/_next/static/chunks/main.js"></script>
<link href="/next-ts-hands-on/_next/static/css/app.css" />
<a href="/next-ts-hands-on/about">About</a>

<!-- 브라우저 요청 -->
GET https://username.github.io/next-ts-hands-on/_next/static/chunks/main.js
                               └───────────┬────────────┘
                               경로 일치! 200 OK ✅
```

#### 📝 코드에서의 동작

```typescript
// 컴포넌트 코드 (변경 불필요!)
import Link from 'next/link';

export default function Nav() {
  return (
    <Link href="/about">About</Link>
    //           ↑
    //    basePath 자동 추가됨!
    //    실제 생성: /next-ts-hands-on/about
  );
}
```

```typescript
// 이미지 경로도 자동 처리
import Image from 'next/image';

<Image src="/logo.png" />
//          ↑
//    실제 경로: /next-ts-hands-on/logo.png
```

#### 🎯 언제 필요한가?

| 배포 환경 | basePath 필요? | 이유 |
|----------|---------------|------|
| `username.github.io/repo-name/` | ✅ 필요 | 서브 경로 |
| `username.github.io/` | ❌ 불필요 | 루트 경로 |
| Vercel (`app.vercel.app`) | ❌ 불필요 | 루트 경로 |
| Netlify | ❌ 불필요 | 루트 경로 |
| 커스텀 도메인 (`example.com`) | ❌ 불필요 | 루트 경로 |

---

### 3️⃣ `assetPrefix: '/next-ts-hands-on'` (라인 9)

#### 📌 의미
```typescript
assetPrefix: '/next-ts-hands-on'
```
**정적 자산(CSS, JS, 이미지)의 URL 접두사**를 설정합니다.

#### 🎨 basePath vs assetPrefix

```typescript
basePath: '/next-ts-hands-on'      // 앱 경로
assetPrefix: '/next-ts-hands-on'   // 자산 경로
```

**차이점:**

```html
<!-- basePath: 페이지 라우팅 -->
<Link href="/about" />
→ /next-ts-hands-on/about

<!-- assetPrefix: 정적 파일 -->
<script src="/_next/static/chunks/main.js" />
→ /next-ts-hands-on/_next/static/chunks/main.js

<link href="/_next/static/css/app.css" />
→ /next-ts-hands-on/_next/static/css/app.css
```

#### 🌍 고급 사용 예시

**CDN 배포:**
```typescript
// CDN에서 자산 서빙
assetPrefix: 'https://cdn.example.com'

// 생성된 HTML
<script src="https://cdn.example.com/_next/static/chunks/main.js"></script>
```

**서브도메인:**
```typescript
assetPrefix: 'https://static.example.com'
```

#### 📊 GitHub Pages에서

```typescript
// 같은 값으로 설정 (동일한 서브 경로)
basePath: '/next-ts-hands-on'
assetPrefix: '/next-ts-hands-on'

// 결과
페이지: https://username.github.io/next-ts-hands-on/
자산:   https://username.github.io/next-ts-hands-on/_next/static/...
```

#### ⚠️  주의사항

```typescript
// ❌ 잘못된 설정
basePath: '/next-ts-hands-on'
assetPrefix: '/different-path'    // 불일치!
// → 페이지는 로드되지만 CSS/JS 404 에러

// ✅ 올바른 설정
basePath: '/next-ts-hands-on'
assetPrefix: '/next-ts-hands-on'  // 동일!
```

---

### 4️⃣ `trailingSlash: true` (라인 10)

#### 📌 의미
```typescript
trailingSlash: true
```
모든 URL 끝에 **슬래시(/)를 추가**합니다.

#### 🔗 URL 형식 변화

**trailingSlash: false (기본값):**
```
https://example.com/about
https://example.com/posts/1
https://example.com/api/data
```

**trailingSlash: true:**
```
https://example.com/about/      ← 끝에 /
https://example.com/posts/1/    ← 끝에 /
https://example.com/api/data/   ← 끝에 /
```

#### 🏗️ 빌드 결과 변화

**trailingSlash: false:**
```
out/
├── about.html
├── posts/
│   └── 1.html
└── api/
    └── data.json
```

**trailingSlash: true:**
```
out/
├── about/
│   └── index.html        ← 디렉토리 형태
├── posts/
│   └── 1/
│       └── index.html    ← 디렉토리 형태
└── api/
    └── data/
        └── index.json
```

#### 🎯 왜 GitHub Pages에서 필요한가?

**GitHub Pages의 URL 처리:**

```bash
# trailing slash 없이 요청
GET /about
→ GitHub Pages: /about.html 찾기
→ 파일 없으면 404 (디렉토리만 있음)

# trailing slash로 요청
GET /about/
→ GitHub Pages: /about/index.html 찾기
→ 파일 발견! 200 OK ✅
```

**정적 웹서버의 기본 동작:**
```
/about/  → /about/index.html (자동 인덱스)
/about   → /about 파일 찾기 (없으면 404)
```

#### 📊 영향

| 측면 | trailingSlash: false | trailingSlash: true |
|------|---------------------|-------------------|
| **URL** | `/about` | `/about/` |
| **파일** | `about.html` | `about/index.html` |
| **GitHub Pages** | ⚠️  일부 404 | ✅ 안정적 |
| **SEO** | 단일 URL | 단일 URL |
| **브라우저** | 자동 리다이렉트 필요 | 바로 로드 |

#### 🔄 자동 리다이렉트

```typescript
// trailingSlash: true 설정 시
// Next.js가 자동으로 리다이렉트 추가

브라우저 요청: /about
            ↓
Next.js 응답: 308 Redirect
            ↓
브라우저 이동: /about/  (자동)
```

---

### 5️⃣ `images: { unoptimized: true }` (라인 11)

#### 📌 의미
```typescript
images: { unoptimized: true }
```
Next.js의 **자동 이미지 최적화를 비활성화**합니다.

#### 🖼️ Next.js 이미지 최적화란?

**일반 이미지 (HTML):**
```html
<img src="/photo.jpg" />
```

**Next.js Image 컴포넌트 (기본):**
```typescript
import Image from 'next/image';

<Image src="/photo.jpg" width={800} height={600} />
```

**Next.js가 자동으로 하는 일 (기본값):**
```
1. WebP/AVIF 변환 (최신 포맷)
2. 크기 최적화 (responsive)
3. Lazy loading (뷰포트 진입 시)
4. Blur placeholder
5. 디바이스별 최적화

요청: /photo.jpg
 ↓
Next.js 서버가 실시간 처리
 ↓
응답: 최적화된 이미지 (WebP, 800x600)
```

#### 🚫 왜 비활성화해야 하나?

**Static Export의 한계:**

```typescript
// 이미지 최적화는 서버가 필요!
┌─────────────┐
│ 브라우저    │
│ 요청: 이미지 │
└──────┬──────┘
       ↓
┌─────────────────────┐
│ Next.js 서버        │  ← 없음! (정적 호스팅)
│ - 이미지 리사이징   │
│ - 포맷 변환         │
│ - 캐싱              │
└─────────────────────┘
       ↓
      ❌ 불가능
```

**정적 빌드 시:**
```typescript
output: 'export'
images: { unoptimized: false }  // 기본값

// 빌드 실행
npm run build:static

// 에러 발생
Error: Image Optimization using the default loader cannot be used with `output: 'export'`.
```

#### ⚙️ unoptimized: true의 효과

```typescript
images: { unoptimized: true }

// Next.js의 동작
<Image src="/photo.jpg" width={800} height={600} />
       ↓
// 최적화 없이 원본 이미지 사용
<img src="/photo.jpg" width="800" height="600" 
     style="..." />
```

**빌드 결과:**
```
out/
├── photo.jpg         ← 원본 그대로
├── logo.png          ← 원본 그대로
└── _next/
    └── static/
```

#### 💡 대안

**1. 빌드 전 수동 최적화**
```bash
# 이미지 압축 도구 사용
npm install -g sharp-cli

sharp -i input.jpg -o output.jpg \
  --format webp \
  --quality 80
```

**2. CDN 이미지 최적화**
```typescript
// Cloudinary, Imgix 등 외부 서비스
<Image 
  src="https://res.cloudinary.com/.../photo.jpg"
  loader={cloudinaryLoader}
/>
```

**3. 정적 최적화 플러그인**
```bash
# next-optimized-images (추가 패키지)
npm install next-optimized-images
```

#### 📊 영향 비교

| 측면 | unoptimized: false (기본) | unoptimized: true |
|------|-------------------------|-------------------|
| **빌드** | Static Export 에러 | ✅ 정상 빌드 |
| **이미지 크기** | 자동 최적화 (작음) | 원본 크기 (큼) |
| **포맷 변환** | WebP/AVIF | 원본 포맷 |
| **Lazy loading** | ✅ 지원 | ✅ 지원 |
| **서버 필요** | ✅ 필요 | ❌ 불필요 |
| **GitHub Pages** | ❌ 불가 | ✅ 가능 |

---

## 🎯 전체 설정의 시너지

```typescript
const isStaticExport = process.env.STATIC_EXPORT === 'true';

...(isStaticExport && {
  output: 'export',                   // 정적 HTML 생성
  basePath: '/next-ts-hands-on',      // GitHub 서브 경로
  assetPrefix: '/next-ts-hands-on',   // 자산 경로 일치
  trailingSlash: true,                // 안정적 URL
  images: { unoptimized: true },      // 서버 없이 이미지
}),
```

### 📊 설정 간 관계

```
output: 'export'
    ↓ (필수)
images: { unoptimized: true }
    (서버 없는 환경)

basePath: '/next-ts-hands-on'
    ↓ (일치 필요)
assetPrefix: '/next-ts-hands-on'
    (같은 서브 경로)

trailingSlash: true
    ↓ (GitHub Pages 호환)
output: 'export'
    (디렉토리 구조)
```

---

## 💡 실전 예시

### GitHub Pages 배포

```bash
# 1. 환경 변수 설정
STATIC_EXPORT=true

# 2. 빌드 실행
npm run build:static

# 3. 생성 결과
out/
├── index.html                              # /
├── about/
│   └── index.html                          # /about/
├── _next/
│   └── static/
│       ├── chunks/
│       │   └── main-abc123.js
│       └── css/
│           └── app-def456.css
└── images/
    └── logo.png

# 4. HTML 내용 확인
cat out/index.html

<html>
  <head>
    <link href="/next-ts-hands-on/_next/static/css/app-def456.css" />
                └──────┬──────┘
                assetPrefix
  </head>
  <body>
    <a href="/next-ts-hands-on/about/">About</a>
             └──────┬──────┘
              basePath
    
    <img src="/next-ts-hands-on/images/logo.png" />
              └──────┬──────┘
              basePath
    
    <script src="/next-ts-hands-on/_next/static/chunks/main-abc123.js"></script>
                 └──────┬──────┘
                 assetPrefix
  </body>
</html>

# 5. 배포 후 URL
https://username.github.io/next-ts-hands-on/
                           └──────┬──────┘
                           basePath
```

---

## 🔍 각 설정이 없으면?

### ❌ output: 'export' 없으면
```bash
npm run build:static

# 결과
.next/                    # 서버 코드 포함
└── server/              # GitHub Pages에서 실행 불가
```

### ❌ basePath 없으면
```html
<!-- 생성된 HTML -->
<script src="/_next/static/chunks/main.js"></script>

<!-- 브라우저 요청 -->
GET https://username.github.io/_next/static/chunks/main.js
                               ↑ 404! (실제 위치: /next-ts-hands-on/_next/...)
```

### ❌ assetPrefix 없으면
```html
<!-- basePath만 있으면 페이지는 로드 -->
<html>...</html>  ✅

<!-- 하지만 CSS/JS는 404 -->
<link href="/_next/static/css/app.css" />  ❌
```

### ❌ trailingSlash 없으면
```bash
GET /about
→ /about.html 찾기
→ 없음 (디렉토리만 있음)
→ 404 Not Found
```

### ❌ images: { unoptimized: true } 없으면
```bash
npm run build:static

Error: Image Optimization using the default loader 
cannot be used with `output: 'export'`.
```

---

## 📚 추가 학습 자료

### Next.js 공식 문서
- [Static Exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [basePath](https://nextjs.org/docs/app/api-reference/next-config-js/basePath)
- [assetPrefix](https://nextjs.org/docs/app/api-reference/next-config-js/assetPrefix)
- [trailingSlash](https://nextjs.org/docs/app/api-reference/next-config-js/trailingSlash)
- [Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)

---

## 🎓 최종 요약

| 설정 | 역할 | GitHub Pages 필수? |
|------|------|------------------|
| `output: 'export'` | 정적 HTML 생성 | ✅ 필수 |
| `basePath` | 앱 경로 접두사 | ✅ 필수 (프로젝트 사이트) |
| `assetPrefix` | 자산 경로 접두사 | ✅ 필수 (basePath와 동일) |
| `trailingSlash` | URL 끝 `/` 추가 | ✅ 권장 |
| `images: { unoptimized }` | 이미지 최적화 비활성화 | ✅ 필수 |

**한 문장 요약:**
> 이 5가지 설정은 Next.js를 **서버 없는 정적 사이트**로 변환하고,
> **GitHub Pages의 서브 경로**에서 정상 작동하도록 만듭니다! 🚀

