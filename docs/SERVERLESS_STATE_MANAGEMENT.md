# Serverless 환경에서의 상태 관리 문제와 해결책

## 📋 목차
1. [문제 발견](#1-문제-발견)
2. [근본 원인 분석](#2-근본-원인-분석)
3. [왜 로컬에서는 작동했나?](#3-왜-로컬에서는-작동했나)
4. [해결책 비교](#4-해결책-비교)
5. [플랫폼별 권장 사항](#5-플랫폼별-권장-사항)
6. [학습 포인트](#6-학습-포인트)

---

## 1. 문제 발견

### 1.1 증상

Vercel에 배포 후 좋아요 기능에서 다음과 같은 문제 발생:

```
사용자 행동:
1. 좋아요 버튼 클릭 → 카운트 5
2. About 페이지 이동
3. Home 페이지 복귀 → 카운트 0 또는 1 또는 4 (랜덤)
4. 새로고침 → 0, 1, 4, 5 등 무작위로 표시

⚠️  결과: 데이터가 일관되게 유지되지 않음
```

### 1.2 문제가 된 코드

```typescript
// src/app/api/likes/route.ts

// ❌ 문제: in-memory Map 사용
const likesStore = new Map<string, number>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');
  
  const likes = likesStore.get(postId) || 0;
  
  return NextResponse.json({ 
    postId,
    likes,
    message: '서버에서 좋아요 수를 조회했습니다.'
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { postId } = body;
  
  // 현재 값 가져오기
  const currentLikes = likesStore.get(postId) || 0;
  const newLikes = currentLikes + 1;
  
  // Map에 저장
  likesStore.set(postId, newLikes);
  
  return NextResponse.json({ 
    postId,
    likes: newLikes,
    message: '좋아요가 증가했습니다.'
  });
}
```

**의도:**
- 간단한 카운터 구현
- Map에 postId → 좋아요 수 저장
- GET: Map에서 조회
- POST: Map에 저장

**예상:**
- 좋아요 수가 계속 유지됨
- 새로고침해도 같은 값

**실제:**
- 요청마다 다른 값 반환
- 데이터가 사라지거나 과거 값으로 돌아감

---

## 2. 근본 원인 분석

### 2.1 Serverless Function의 Stateless 특성

#### 전통적인 서버 (항상 실행)

```
┌─────────────────────────────────────────┐
│ Node.js 서버 (24/7 실행)                │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ const likesStore = new Map()            │
│                                         │
│ 시작 시 초기화 (1회):                   │
│ likesStore = Map {}                     │
│                                         │
│ 이후 모든 요청이 같은 Map 사용:          │
│ 요청 1 → likesStore.set('1', 1)        │
│ 요청 2 → likesStore.get('1') = 1 ✅    │
│ 요청 3 → likesStore.set('1', 2)        │
│ 요청 4 → likesStore.get('1') = 2 ✅    │
│ 요청 5 → likesStore.set('1', 3)        │
│ ...                                     │
│                                         │
│ 메모리가 서버 종료까지 계속 유지됨!      │
└─────────────────────────────────────────┘
```

#### Serverless Function (요청마다 컨테이너)

```
요청 1:
┌──────────────────────────────┐
│ 컨테이너 A 시작              │
│ const likesStore = new Map() │ ← 빈 Map 생성
│ POST → set('1', 1)           │
│ 응답: { likes: 1 }           │
│ 컨테이너 A 대기 또는 종료     │
└──────────────────────────────┘

요청 2 (10초 후):
┌──────────────────────────────┐
│ 컨테이너 B 시작 (새 컨테이너!)│
│ const likesStore = new Map() │ ← 또 빈 Map 생성!
│ GET → get('1') = undefined   │
│ 응답: { likes: 0 }           │ ← 이전 값 사라짐!
└──────────────────────────────┘

요청 3 (바로):
┌──────────────────────────────┐
│ 컨테이너 C 시작 (또 새 것!)   │
│ const likesStore = new Map() │ ← 또 빈 Map!
│ POST → set('1', 1)           │
│ 응답: { likes: 1 }           │
└──────────────────────────────┘

요청 4 (바로):
┌──────────────────────────────┐
│ 컨테이너 A 재사용 (운이 좋음) │
│ likesStore.get('1') = 1      │ ← 요청 1의 값 남아있음
│ 응답: { likes: 1 }           │
└──────────────────────────────┘

요청 5 (바로):
┌──────────────────────────────┐
│ 컨테이너 C 재사용             │
│ likesStore.get('1') = 1      │ ← 요청 3의 값
│ 응답: { likes: 1 }           │
└──────────────────────────────┘

결과: 0 → 1 → 1 → 1 → 1 (랜덤!)
실제: 0 → 0 → 1 → 4 → 0 (더 랜덤!)
```

### 2.2 왜 랜덤하게 나오나?

**Serverless 컨테이너 로드 밸런싱:**

```
사용자 요청
    ↓
Vercel Edge Network
    ↓
로드 밸런서
    ↓
    ├─→ 컨테이너 A (Map: { '1': 5 })
    ├─→ 컨테이너 B (Map: { '1': 1 })
    ├─→ 컨테이너 C (Map: {})
    ├─→ 컨테이너 D (Map: { '1': 4 })
    └─→ 컨테이너 E (Map: { '1': 2 })

어느 컨테이너로 갈지 예측 불가!
→ 매번 다른 값 반환
```

**컨테이너 생명주기:**

```
1. Cold Start (처음 요청)
   - 새 컨테이너 시작 (0.5~2초 소요)
   - const likesStore = new Map() 실행
   - 빈 Map에서 시작

2. Warm (일정 시간 내 재사용)
   - 기존 컨테이너 재사용 (~5분)
   - 이전 Map 데이터 남아있음
   - 빠른 응답 (0.1초)

3. 컨테이너 종료
   - 일정 시간 요청 없으면 종료
   - Map 데이터 완전히 소실

4. 스케일 아웃
   - 동시 요청 많으면 컨테이너 추가 생성
   - 각자 독립적인 Map 보유
   - 데이터 불일치 발생
```

### 2.3 실제 Vercel 환경에서의 동작

```typescript
// 시나리오: 5번의 연속 요청

요청 1 (t=0s): POST /api/likes { postId: "1" }
→ Cold Start → 컨테이너 A 생성
→ likesStore = Map {}
→ set('1', 1)
→ 응답: { likes: 1 }

요청 2 (t=2s): GET /api/likes?postId=1
→ 컨테이너 B 생성 (동시 요청 처리 위해)
→ likesStore = Map {}  ← 새 Map!
→ get('1') = undefined
→ 응답: { likes: 0 }  ⚠️  1이어야 하는데 0!

요청 3 (t=3s): POST /api/likes { postId: "1" }
→ 컨테이너 A 재사용 (아직 Warm)
→ likesStore = Map { '1': 1 }
→ set('1', 2)
→ 응답: { likes: 2 }

요청 4 (t=4s): GET /api/likes?postId=1
→ 컨테이너 C 생성 (또 동시 요청)
→ likesStore = Map {}
→ 응답: { likes: 0 }  ⚠️  2여야 하는데 0!

요청 5 (t=10분): GET /api/likes?postId=1
→ 모든 컨테이너 종료됨 (Timeout)
→ 컨테이너 D 새로 생성
→ likesStore = Map {}
→ 응답: { likes: 0 }  ⚠️  완전히 리셋!
```

---

## 3. 왜 로컬에서는 작동했나?

### 3.1 로컬 개발 서버 vs Vercel Production

#### 로컬 (npm run dev)

```
터미널 1:
$ npm run dev
▲ Next.js 16.0.0
- Local: http://localhost:3000
✓ Ready in 1.2s

→ 하나의 Node.js 프로세스 시작
→ 종료할 때까지 계속 실행
→ const likesStore = new Map() (1회만 실행)
→ 모든 요청이 같은 Map 사용 ✅

브라우저 요청:
요청 1 → localhost:3000 → 같은 프로세스
요청 2 → localhost:3000 → 같은 프로세스
요청 3 → localhost:3000 → 같은 프로세스
...
→ Map이 계속 유지됨!
```

#### Vercel Production

```
배포 후:
→ Serverless Function으로 변환
→ 요청마다 다른 컨테이너 가능
→ const likesStore = new Map() (매번 실행 가능)
→ 각 컨테이너가 독립적인 Map 보유 ❌

사용자 요청:
요청 1 → vercel.app → 컨테이너 A
요청 2 → vercel.app → 컨테이너 B (다른 것!)
요청 3 → vercel.app → 컨테이너 A (재사용)
요청 4 → vercel.app → 컨테이너 C (또 다른 것!)
...
→ Map이 유지 안 됨!
```

### 3.2 로컬 테스트의 한계

```javascript
// 로컬에서 테스트:

console.log('좋아요 1회 클릭');
// POST /api/likes → { likes: 1 } ✅

console.log('페이지 이동 후 복귀');
// GET /api/likes → { likes: 1 } ✅

console.log('좋아요 또 클릭');
// POST /api/likes → { likes: 2 } ✅

console.log('새로고침');
// GET /api/likes → { likes: 2 } ✅

→ "완벽하게 작동한다!" (착각)
→ 로컬은 단일 프로세스라 당연함
→ Serverless 환경과 완전히 다름!
```

**교훈:**
> 로컬에서 작동 ≠ 프로덕션에서 작동  
> Serverless 환경에서는 상태가 유지되지 않는다!

---

## 4. 해결책 비교

### 4.1 해결책 개요

| 해결책 | 플랫폼 독립성 | 설정 난이도 | 비용 | 추천도 |
|--------|--------------|------------|------|--------|
| Supabase | ✅ 완전 독립 | ⭐⭐⭐ | 무료 500MB | ⭐⭐⭐⭐⭐ |
| Vercel KV | ❌ Vercel 전용 | ⭐ | 무료 10K/day | ⭐⭐⭐⭐ |
| Vercel Postgres | ❌ Vercel 전용 | ⭐⭐ | 무료 256MB | ⭐⭐⭐⭐ |
| localStorage | ✅ 완전 독립 | ⭐ | 무료 | ⭐⭐ (임시) |

### 4.2 Supabase (플랫폼 독립적) ⭐⭐⭐⭐⭐

**장점:**
- ✅ Vercel, Cloud Run, Amplify 모두 사용 가능
- ✅ 완전 무료 (500MB 데이터베이스)
- ✅ 실시간 구독 (Realtime)
- ✅ 인증 시스템 내장
- ✅ Row Level Security
- ✅ PostgreSQL (관계형 DB)

**설정 방법:**

```bash
# 1. Supabase 프로젝트 생성
https://supabase.com/ → 회원가입 → 프로젝트 생성

# 2. 환경 변수 설정 (.env.local)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...

# 3. 라이브러리 설치
npm install @supabase/supabase-js
```

**테이블 생성 (SQL Editor):**

```sql
-- likes 테이블 생성
CREATE TABLE likes (
  post_id TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 좋아요 증가 함수 (원자적 연산)
CREATE OR REPLACE FUNCTION increment_likes(p_post_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO likes (post_id, count)
  VALUES (p_post_id, 1)
  ON CONFLICT (post_id)
  DO UPDATE SET 
    count = likes.count + 1,
    updated_at = NOW()
  RETURNING count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;
```

**코드 구현:**

```typescript
// src/app/api/likes/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * GET 요청: 좋아요 수 조회
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');
  
  if (!postId) {
    return NextResponse.json(
      { error: 'postId is required' },
      { status: 400 }
    );
  }
  
  // Supabase에서 조회
  const { data, error } = await supabase
    .from('likes')
    .select('count')
    .eq('post_id', postId)
    .single();
  
  // 데이터 없음 (PGRST116)은 정상 → 0으로 처리
  if (error && error.code !== 'PGRST116') {
    console.error('Supabase error:', error);
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    );
  }
  
  return NextResponse.json({ 
    postId, 
    likes: data?.count ?? 0,
    message: 'Supabase에서 조회했습니다.'
  });
}

/**
 * POST 요청: 좋아요 증가
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { postId } = body;
    
    if (!postId) {
      return NextResponse.json(
        { error: 'postId is required' },
        { status: 400 }
      );
    }
    
    // Supabase 함수 호출 (원자적 증가)
    const { data, error } = await supabase
      .rpc('increment_likes', { p_post_id: postId });
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      postId, 
      likes: data,
      message: '좋아요가 증가했습니다.'
    });
  } catch (error) {
    console.error('Request error:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
```

**동작 방식:**

```
Before (in-memory Map):
┌──────────────────────────────┐
│ 요청 1 → 컨테이너 A          │
│   Map { '1': 1 }             │
│ 요청 2 → 컨테이너 B          │
│   Map {}  ← 사라짐!          │
└──────────────────────────────┘

After (Supabase):
┌──────────────────────────────┐
│ 요청 1 → 컨테이너 A          │
│   → Supabase DB에 저장       │
│   → { post_id: '1', count: 1 }│
│                              │
│ 요청 2 → 컨테이너 B          │
│   → Supabase DB에서 조회     │
│   → { post_id: '1', count: 1 }│
│   ✅ 데이터 유지됨!          │
└──────────────────────────────┘

모든 컨테이너가 같은 Supabase DB 사용
→ 데이터 일관성 보장!
```

**무료 티어:**
- 500MB 데이터베이스
- 무제한 API 요청
- 1GB 파일 저장소
- 실시간 구독
- **완전 무료!**

### 4.3 Vercel KV (Vercel 전용) ⭐⭐⭐⭐

**장점:**
- ✅ Vercel과 완벽 통합
- ✅ 매우 빠른 속도 (Redis)
- ✅ 설정 매우 간단 (3분)
- ✅ `incr()` 명령으로 원자적 증가

**단점:**
- ❌ Vercel에서만 사용 가능
- ❌ Cloud Run/Amplify에서 사용 불가

**코드:**

```typescript
import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');
  
  if (!postId) {
    return NextResponse.json({ error: 'postId required' }, { status: 400 });
  }
  
  const likes = (await kv.get<number>(`likes:${postId}`)) ?? 0;
  
  return NextResponse.json({ postId, likes });
}

export async function POST(request: Request) {
  const { postId } = await request.json();
  
  if (!postId) {
    return NextResponse.json({ error: 'postId required' }, { status: 400 });
  }
  
  // incr()로 원자적 증가
  const newLikes = await kv.incr(`likes:${postId}`);
  
  return NextResponse.json({ postId, likes: newLikes });
}
```

### 4.4 localStorage만 사용 (임시) ⭐⭐

**장점:**
- ✅ 플랫폼 독립적
- ✅ 설정 불필요
- ✅ 즉시 작동

**단점:**
- ❌ 사용자 간 공유 안 됨
- ❌ 브라우저별 데이터 분리
- ❌ 실제 서비스 부적합

**사용 시기:**
- 학습 목적
- 빠른 프로토타입
- 개인 전용 기능

---

## 5. 플랫폼별 권장 사항

### 5.1 Vercel 배포

**추천 순위:**

1. **Vercel KV** ⭐⭐⭐⭐⭐
   - Vercel만 사용한다면 최고의 선택
   - 설정 매우 간단
   - 빠른 속도

2. **Supabase** ⭐⭐⭐⭐
   - 나중에 다른 플랫폼 사용 가능성 있으면
   - 더 많은 기능 필요하면

3. **Vercel Postgres** ⭐⭐⭐
   - SQL 필요하면
   - 관계형 데이터면

### 5.2 Cloud Run 배포

**추천 순위:**

1. **Supabase** ⭐⭐⭐⭐⭐
   - 플랫폼 독립적
   - 완전 무료
   - PostgreSQL

2. **Google Cloud SQL** ⭐⭐⭐⭐
   - Google 생태계 통합
   - 하지만 비용 발생

3. **Google Firestore** ⭐⭐⭐
   - NoSQL 필요하면
   - 실시간 구독 필요하면

### 5.3 AWS Amplify 배포

**추천 순위:**

1. **Supabase** ⭐⭐⭐⭐⭐
   - 플랫폼 독립적
   - 완전 무료

2. **AWS RDS** ⭐⭐⭐⭐
   - AWS 생태계 통합
   - 하지만 비용 발생

3. **AWS DynamoDB** ⭐⭐⭐
   - NoSQL 필요하면
   - Serverless 친화적

### 5.4 다중 플랫폼 배포 (권장)

**하나의 소스로 여러 플랫폼:**

```
next-ts-hands-on/
├── Vercel 배포    → Supabase 사용
├── Cloud Run 배포 → Supabase 사용 (같은 DB)
└── Amplify 배포   → Supabase 사용 (같은 DB)

✅ 장점:
- 코드 변경 없음
- 환경 변수만 설정
- 모든 플랫폼에서 같은 데이터 공유
```

**환경 변수 설정:**

```bash
# Vercel
Vercel Dashboard → Settings → Environment Variables
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...

# Cloud Run
gcloud run deploy --set-env-vars \
  SUPABASE_URL=https://xxx.supabase.co,\
  SUPABASE_ANON_KEY=eyJxxx...

# Amplify
Amplify Console → Environment Variables
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
```

---

## 6. 학습 포인트

### 6.1 Serverless의 핵심 원칙

```
❌ 절대 안 됨:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✗ in-memory 변수 (Map, Array, Object)
✗ 전역 변수에 데이터 저장
✗ 파일 시스템 쓰기 (/tmp 제외)
✗ "이전 요청 상태"에 의존하는 로직

✅ 사용해야 함:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 데이터베이스 (PostgreSQL, MySQL)
✓ 캐시 (Redis, Memcached)
✓ 외부 저장소 (S3, GCS, Blob)
✓ API 호출로 상태 조회
```

### 6.2 로컬 vs 프로덕션 차이

| 측면 | 로컬 (npm run dev) | 프로덕션 (Serverless) |
|------|-------------------|----------------------|
| 프로세스 | 단일, 계속 실행 | 다중, 요청마다 가능 |
| 메모리 | 유지됨 | 요청 간 유지 안 됨 |
| 전역 변수 | 공유됨 | 독립적 |
| 파일 시스템 | 영구 | 휘발성 (/tmp만) |
| 네트워크 지연 | ~1ms | ~100-500ms |
| 콜드 스타트 | 없음 | 0.5-2초 |

### 6.3 디버깅 팁

**로컬에서 Serverless 시뮬레이션:**

```bash
# 방법 1: 개발 서버를 자주 재시작
npm run dev
# 요청 1회
Ctrl+C
npm run dev
# 요청 1회
Ctrl+C
# → Map이 매번 초기화되어 Serverless 느낌

# 방법 2: Docker로 테스트
docker build -t test-app .
docker run -p 3000:3000 test-app
# 요청 1회
docker stop $(docker ps -q)
docker run -p 3000:3000 test-app
# 요청 1회
# → 컨테이너마다 독립적
```

**프로덕션 로깅:**

```typescript
// API Route에 로깅 추가
const requestId = Math.random().toString(36).substr(2, 9);
const containerId = process.env.HOSTNAME || 'unknown';

console.log(`[${requestId}] Container: ${containerId}`);
console.log(`[${requestId}] Map size: ${likesStore.size}`);
console.log(`[${requestId}] Map contents:`, Object.fromEntries(likesStore));

// Vercel Logs에서 확인:
// [abc123] Container: srv-001
// [abc123] Map size: 0    ← 빈 Map!
// 
// [def456] Container: srv-002
// [def456] Map size: 1    ← 다른 컨테이너는 1개
```

### 6.4 체크리스트

**Serverless 배포 전 확인:**

```markdown
□ in-memory 변수 사용하지 않는가?
□ 전역 상태에 의존하지 않는가?
□ 데이터베이스나 캐시를 사용하는가?
□ 환경 변수로 설정을 관리하는가?
□ 요청마다 독립적으로 동작하는가?
□ 파일 시스템 쓰기를 하지 않는가?
□ 로깅을 충분히 추가했는가?
□ 로컬과 프로덕션 환경 차이를 이해하는가?
```

### 6.5 마이그레이션 전략

**기존 코드 → Serverless 전환:**

```typescript
// Step 1: 문제 코드 식별
const globalCache = new Map();  // ← 문제!

// Step 2: 임시 해결 (경고 추가)
const globalCache = new Map();
console.warn('⚠️  WARNING: in-memory cache in serverless!');

// Step 3: 데이터베이스 추가
const supabase = createClient(...);

// Step 4: 하이브리드 (로컬=Map, 프로덕션=DB)
const isProduction = process.env.NODE_ENV === 'production';
const storage = isProduction 
  ? { get: (k) => supabase.from('cache').select()... }
  : { get: (k) => globalCache.get(k) };

// Step 5: 완전 전환 (Map 제거)
// globalCache 삭제
// Supabase만 사용
```

---

## 7. 결론

### 7.1 핵심 교훈

1. **Serverless는 Stateless다**
   - 요청 간 상태 유지 안 됨
   - 컨테이너가 독립적
   - 외부 저장소 필수

2. **로컬 테스트만으로는 부족하다**
   - 로컬: 단일 프로세스
   - 프로덕션: 다중 컨테이너
   - 환경 차이 이해 필수

3. **플랫폼 독립적 설계가 좋다**
   - Vercel KV → Vercel에 종속
   - Supabase → 어디서나 사용 가능
   - 마이그레이션 유연성 확보

### 7.2 권장 솔루션

**다중 플랫폼 배포 계획이 있다면:**

→ **Supabase** ⭐⭐⭐⭐⭐

이유:
- ✅ Vercel, Cloud Run, Amplify 모두 사용 가능
- ✅ 완전 무료 (500MB)
- ✅ 실시간 구독, 인증, 저장소 등 추가 기능
- ✅ 코드 변경 없이 플랫폼 전환 가능
- ✅ 환경 변수만 설정하면 됨

**Vercel만 사용한다면:**

→ **Vercel KV** ⭐⭐⭐⭐⭐

이유:
- ✅ 설정 매우 간단 (3분)
- ✅ 빠른 속도 (Redis)
- ✅ Vercel과 완벽 통합

### 7.3 다음 단계

1. **Supabase 설정** (추천)
   - https://supabase.com 회원가입
   - 프로젝트 생성
   - 테이블 생성 (SQL Editor)
   - 환경 변수 설정

2. **코드 구현**
   - `npm install @supabase/supabase-js`
   - `route.ts` 수정
   - 로컬 테스트

3. **배포**
   - Vercel: 환경 변수 추가
   - Cloud Run: `--set-env-vars`
   - Amplify: Environment Variables

4. **검증**
   - 좋아요 클릭 → 페이지 이동 → 복귀
   - 여러 브라우저에서 동시 테스트
   - Supabase Dashboard에서 데이터 확인

---

## 참고 자료

- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Serverless Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

---

**작성일:** 2025-10-26  
**프로젝트:** next-ts-hands-on  
**작성자:** AI Assistant

