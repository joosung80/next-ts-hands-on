# export const dynamic 동작 원리 완벽 가이드

## 📌 53번 라인이 중요한 이유

```typescript
export const dynamic = 'force-dynamic';  // ← 이 한 줄이 빌드를 결정합니다
```

이 설정은 **Next.js 컴파일러에게 전달되는 지시자**입니다.

---

## 🔍 빌드 타임에 실제로 일어나는 일

### 1단계: 소스 코드 분석 (Build Time)

```bash
$ npm run build
```

Next.js가 모든 파일을 스캔하면서:

```typescript
// Next.js 내부 로직 (의사코드)
function analyzeBuild() {
  const routes = scanAllFiles();
  
  routes.forEach(route => {
    // route.ts 파일에서 export 확인
    if (route.exports.dynamic === 'force-dynamic') {
      console.log('✓ 이 Route는 서버 코드로 빌드');
      compileAsServerCode(route);
    } else if (route.exports.dynamic === 'force-static') {
      console.log('✓ 이 Route는 빌드 타임에 실행');
      preRenderAtBuildTime(route);
    }
  });
}
```

### 2단계: 빌드 결과 생성

#### ✅ force-dynamic의 경우

```
입력: src/app/api/likes/route.ts (5.2 KB)
     ↓
TypeScript 컴파일
     ↓
출력: .next/server/app/api/likes/route.js (331B)
```

**생성된 파일:**
```bash
.next/
└── server/
    └── app/
        └── api/
            └── likes/
                ├── route.js          # 실제 서버 코드
                ├── route.js.map      # 디버깅용 소스맵
                └── route.js.nft.json # 의존성 추적
```

**빌드 로그:**
```
Route (app)
└ ƒ /api/likes    ← ƒ = Dynamic (서버에서 실행)
```

#### ⚠️  force-static의 경우

```
입력: src/app/api/likes/route.ts
     ↓
빌드 타임 실행 시도
     ↓
⚠️  Warning: API Route는 정적 빌드에서 무시됨
     ↓
출력: (파일 생성 안 됨)
```

**Static Export 시:**
```bash
out/
├── index.html
├── about.html
└── _next/
    └── static/
        └── (API 관련 파일 없음!)
```

---

## 🎯 왜 빌드에 영향을 주는가?

### 근본 원리: 정적 vs 동적

**정적 (Static):**
- 빌드 타임에 **한 번** 실행
- 결과를 **파일로 저장**
- 런타임에는 파일만 서빙

**동적 (Dynamic):**
- 런타임에 **매번** 실행
- 요청마다 **새로운 결과** 생성
- 서버 코드가 필요

### API Route의 특수성

대부분의 API는 동적이어야 합니다:

```typescript
// ❌ 정적으로 만들 수 없는 경우
POST /api/likes  // 데이터 쓰기 → 매번 다른 결과
GET /api/user    // 사용자별 다른 데이터
GET /api/time    // 요청 시각마다 다름

// ✅ 정적으로 만들 수 있는 경우 (드물음)
GET /api/config  // 빌드 타임 설정 (거의 사용 안 함)
```

---

## 📊 실제 빌드 결과 비교

### 시나리오 1: 일반 빌드 + force-dynamic

```bash
# route.ts
export const dynamic = 'force-dynamic';

# 빌드
npm run build
```

**결과:**
```
✅ 빌드 성공!

생성된 파일:
.next/server/app/api/likes/route.js (331B)

런타임:
GET /api/likes?postId=1
→ Node.js가 route.js 실행
→ Map에서 데이터 조회
→ { likes: 7 } 응답
```

### 시나리오 2: Static Export + force-dynamic

```bash
# route.ts
export const dynamic = 'force-dynamic';

# next.config.ts
output: 'export'

# 빌드
npm run build:static
```

**결과:**
```
❌ 빌드 에러!

Error: Page "/api/likes/route" is using dynamic rendering 
but output: 'export' requires all routes to be statically rendered.

원인:
- output: 'export' → 모든 것을 정적 파일로
- force-dynamic → 런타임 서버 필요
- 충돌! → 빌드 불가
```

### 시나리오 3: Static Export + force-static

```bash
# route.ts
export const dynamic = 'force-static';

# next.config.ts
output: 'export'

# 빌드
npm run build:static
```

**결과:**
```
✅ 빌드 성공! (경고 포함)

⚠️  Warning: Route "/api/likes" will be ignored during static export.

생성된 파일:
out/
├── index.html
├── about.html
└── _next/static/...
(API 파일 없음!)

런타임:
GET /api/likes?postId=1
→ GitHub Pages: 404 Not Found
→ LikeButton: localStorage fallback
```

---

## 💡 핵심 정리

### export const dynamic의 역할

| 설정 | 의미 | 빌드 결과 | 런타임 |
|------|------|----------|--------|
| `force-dynamic` | "런타임에 실행해주세요" | 서버 코드 생성 | Node.js 실행 |
| `force-static` | "빌드 타임에 실행해주세요" | 정적 파일 생성 | 파일만 서빙 |

### 빌드 타임 vs 런타임

```
[빌드 타임]                    [런타임]
npm run build                  사용자 요청
     ↓                              ↓
소스 분석                      서버 응답
     ↓                              ↓
force-dynamic 확인             route.js 실행
     ↓                              ↓
서버 코드 생성                 JSON 반환
     ↓
.next/server/...
```

### 왜 이런 설계인가?

**Next.js의 철학:**
1. **가능한 것은 정적으로** → 빠른 속도
2. **필요한 것만 동적으로** → 유연한 기능
3. **명시적으로 선택** → 예측 가능한 동작

**API Route는 대부분 동적이므로:**
- 기본값: `dynamic` (자동 판단)
- 명시: `force-dynamic` (강제 동적)
- 예외: `force-static` (정적 빌드 에러 방지용)

---

## 🔧 실전 사용법

### Dynamic 모드 (추천)

```typescript
// src/app/api/likes/route.ts
export const dynamic = 'force-dynamic';  // ← 현재 설정

export async function GET(request: Request) {
  // 데이터베이스 조회
  // 외부 API 호출
  // 실시간 데이터 처리
  return NextResponse.json({ data });
}
```

**배포:**
- Vercel: `git push` (자동 배포)
- AWS/Docker: `npm run build` + 서버 실행

### Static 모드 (GitHub Pages)

```typescript
// src/app/api/likes/route.ts
export const dynamic = 'force-static';  // ← 수동 변경 필요

// 주의: 이 코드는 런타임에 실행되지 않습니다!
export async function GET(request: Request) {
  // 빌드 시 무시됨
}
```

**배포:**
1. `export const dynamic = 'force-static';`로 변경
2. `npm run build:static`
3. `npm run deploy:static`
4. LikeButton이 자동으로 localStorage 사용

---

## 📚 추가 학습 자료

### Next.js 공식 문서
- [Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic)
- [Static Exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

### 관련 개념
- **Static Site Generation (SSG)**: 빌드 타임 생성
- **Server-Side Rendering (SSR)**: 런타임 생성
- **API Routes**: 서버리스 함수

---

## 🎓 최종 요약

**export const dynamic = 'force-dynamic'은:**

1. **컴파일러 지시자** - Next.js에게 빌드 방법을 알려줌
2. **빌드 결과 결정** - 서버 코드 vs 정적 파일
3. **배포 환경 선택** - Node.js 서버 vs 정적 호스팅
4. **런타임 동작 정의** - 매번 실행 vs 파일 서빙

**간단히 말해:**
> "이 API는 서버에서 실행되어야 하나요?"
> Yes → `force-dynamic`
> No → `force-static` (또는 API 제거)

**53번 라인 한 줄이 전체 빌드를 바꿉니다!** 🚀

