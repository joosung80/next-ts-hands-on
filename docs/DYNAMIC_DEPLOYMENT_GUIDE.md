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

**차세대 풀스택 배포 플랫폼 (AWS 공식)**

AWS Amplify는 AWS의 공식 웹 호스팅 서비스로, Next.js SSR과 API Routes를 완벽하게 지원합니다.

#### 🎯 Amplify의 장점

- ✅ **완전한 SSR 지원**: Next.js 16 최신 기능 지원
- ✅ **API Routes 자동 배포**: Lambda Functions로 변환
- ✅ **자동 HTTPS**: 무료 SSL 인증서
- ✅ **글로벌 CDN**: CloudFront 자동 연동
- ✅ **CI/CD 내장**: Git push 시 자동 배포
- ✅ **미리보기 배포**: PR마다 독립 환경
- ✅ **환경 변수 관리**: AWS Console에서 설정
- ✅ **무료 티어**: 1,000 빌드 분/월, 15GB 전송량

#### 📋 사전 준비

1. **AWS 계정**: https://aws.amazon.com/
2. **GitHub 리포지토리**: 코드가 push 되어 있어야 함
3. **amplify.yml**: 프로젝트 루트에 위치 (이미 포함됨)

#### 🚀 배포 절차

##### 1단계: AWS Amplify Console 접속

```bash
# 1. AWS Console 로그인
https://console.aws.amazon.com/amplify/

# 2. "New app" > "Host web app" 클릭
```

##### 2단계: GitHub 연결

```
1. "GitHub" 선택
2. "Connect branch" 클릭
3. GitHub 계정 인증 (처음 한 번만)
4. 리포지토리 선택: next-ts-hands-on
5. 브랜치 선택: main
6. "Next" 클릭
```

##### 3단계: 빌드 설정

```yaml
# amplify.yml이 자동 감지됨
# 수정이 필요하면 여기서 편집 가능

version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

**설정 확인:**
- App name: `next-ts-hands-on` (또는 원하는 이름)
- Environment: `main` (브랜치명)
- Build command: `npm run build` ✅
- Output directory: `.next` ✅

**"Next" 클릭**

##### 4단계: 고급 설정 (선택사항)

```
환경 변수 추가 (필요 시):
- Key: NEXT_PUBLIC_API_URL
  Value: https://api.example.com

리소스 설정:
- 빌드 인스턴스: General1 (기본값, 무료 티어)
- Node 버전: 20.x (자동 감지)
```

**"Save and deploy" 클릭**

##### 5단계: 배포 대기

```
빌드 단계 (약 3-5분):
┌─────────────────────────────────────┐
│ 1. Provision    (인프라 준비)       │ 30초
│ 2. Build        (앱 빌드)           │ 2-3분
│ 3. Deploy       (배포)              │ 1분
│ 4. Verify       (검증)              │ 30초
└─────────────────────────────────────┘

✅ 성공 시 녹색 체크마크
```

##### 6단계: 배포 완료

```
배포 완료!

URL: https://main.xxxxxx.amplifyapp.com
     └──┬──┘ └───┬───┘
     브랜치   앱 ID
```

#### 🔍 배포 확인

```bash
# 1. 브라우저에서 접속
https://main.xxxxxx.amplifyapp.com/

# 2. 확인 항목
✅ 포스트 5개 즉시 표시 (SSR)
✅ 좋아요 버튼 작동 (API Route)
✅ About 페이지 이동
✅ F12 > Console: 에러 없음
✅ F12 > Elements: HTML에 포스트 데이터 포함
✅ F12 > Network: /api/likes 호출 성공

# 3. API 테스트
curl https://main.xxxxxx.amplifyapp.com/api/likes?postId=1
{
  "postId": "1",
  "likes": 0,
  "message": "서버에서 좋아요 수를 조회했습니다."
}
```

#### ⚙️ amplify.yml 상세 설명

```yaml
version: 1                           # Amplify 설정 버전

frontend:                            # 프론트엔드 빌드 설정
  phases:                            # 빌드 단계
    preBuild:                        # 빌드 전 단계
      commands:
        - npm ci                     # 의존성 설치 (package-lock.json 기준)
        
    build:                           # 빌드 단계
      commands:
        - npm run build              # Next.js 빌드 (동적 모드)
        
  artifacts:                         # 빌드 결과물
    baseDirectory: .next             # Next.js 빌드 출력 디렉토리
    files:
      - '**/*'                       # 모든 파일 포함
      
  cache:                             # 캐시 설정 (빌드 속도 향상)
    paths:
      - node_modules/**/*            # npm 패키지 캐시
      - .next/cache/**/*             # Next.js 빌드 캐시
```

#### 🔧 고급 설정

##### 커스텀 도메인 연결

```
1. Amplify Console > App settings > Domain management
2. "Add domain" 클릭
3. 도메인 입력: example.com
4. DNS 레코드 추가 (제공된 값 복사)
5. 검증 대기 (최대 48시간)

예시 DNS 레코드:
Type: CNAME
Name: www
Value: main.xxxxxx.amplifyapp.com
```

##### 환경 변수 관리

```
1. Amplify Console > App settings > Environment variables
2. "Manage variables" 클릭
3. 추가:
   - NEXT_PUBLIC_STATIC_EXPORT: (빈 값 - 동적 모드)
   - DATABASE_URL: postgres://...
   - API_SECRET_KEY: your-secret-key
4. "Save" 클릭
5. 재배포 트리거
```

##### 브랜치 배포 (Dev/Staging/Prod)

```
1. Amplify Console > App settings > General
2. "Connect branch" 클릭
3. 브랜치 선택:
   - main → Production (main.xxxxx.amplifyapp.com)
   - develop → Staging (develop.xxxxx.amplifyapp.com)
   - feature/* → Preview (pr-123.xxxxx.amplifyapp.com)
```

#### 🐛 문제 해결

##### 빌드 실패

```bash
# 증상: Build 단계에서 빌드 실패

# 해결 방법:
1. Amplify Console > Deployments > 실패한 빌드 클릭
2. "Build logs" 확인
3. 에러 메시지 확인:

일반적인 에러:
- "Module not found" → package.json 확인
- "Build failed" → 로컬에서 npm run build 테스트
- "Out of memory" → Build instance 업그레이드

# 로그 예시:
2025-10-26T10:30:45.123Z [INFO]: # Starting phase: preBuild
2025-10-26T10:30:46.456Z [INFO]: # Executing command: npm ci
2025-10-26T10:32:15.789Z [INFO]: # Starting phase: build
2025-10-26T10:32:16.012Z [INFO]: # Executing command: npm run build
2025-10-26T10:35:20.345Z [ERROR]: Error: Build failed
```

##### API Routes 작동 안 함

```bash
# 증상: /api/likes 404 Not Found

# 원인: output: 'standalone' 설정 누락
# 해결:

1. next.config.ts 확인:
   ...(!isStaticExport && {
     output: 'standalone',  // ← 이 설정 필요
   })

2. 환경 변수 확인:
   STATIC_EXPORT가 설정되어 있으면 제거

3. 재배포
```

##### 성능 최적화

```yaml
# amplify.yml 최적화

version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --prefer-offline       # 오프라인 캐시 우선
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
      - ~/.npm/**/*                     # npm 전역 캐시
```

#### 📊 비용 안내

**AWS Amplify 무료 티어 (월간):**
- ✅ 빌드 시간: 1,000분
- ✅ 호스팅: 15GB 전송량
- ✅ 무료 SSL 인증서
- ✅ 무료 기본 도메인

**예상 사용량 (소규모 프로젝트):**
- 빌드 시간: 5분/배포 × 20배포 = 100분/월
- 전송량: ~1GB/월 (트래픽 적음)
- 비용: **$0/월** (무료 티어 내)

**초과 시 비용:**
- 빌드: $0.01/분
- 전송량: $0.15/GB

**비용 절감 팁:**
- 불필요한 브랜치 배포 비활성화
- 빌드 캐시 활성화 (amplify.yml)
- PR 미리보기 제한 (settings)

#### 🔄 CI/CD 워크플로우

```
Git Push
    ↓
GitHub Webhook
    ↓
AWS Amplify 감지
    ↓
자동 빌드 시작
    ↓
┌─────────────────┐
│ 1. 코드 가져오기 │
│ 2. npm ci        │
│ 3. npm run build │
│ 4. .next/ 배포   │
│ 5. CDN 업데이트  │
└─────────────────┘
    ↓
이메일 알림 (성공/실패)
    ↓
배포 완료!
```

#### 🎯 Amplify vs Vercel 비교

| 항목 | AWS Amplify | Vercel |
|------|------------|--------|
| **SSR 지원** | ✅ 완전 지원 | ✅ 완전 지원 |
| **API Routes** | ✅ Lambda 변환 | ✅ Edge Functions |
| **무료 티어** | 1,000분 빌드/월 | 무제한 빌드 |
| **전송량** | 15GB/월 | 100GB/월 |
| **빌드 속도** | 보통 (3-5분) | 빠름 (2-3분) |
| **글로벌 CDN** | CloudFront | Vercel Edge |
| **커스텀 도메인** | ✅ 무료 | ✅ 무료 |
| **환경 변수** | ✅ 지원 | ✅ 지원 |
| **PR 미리보기** | ✅ 지원 | ✅ 지원 |
| **로그/모니터링** | CloudWatch | Vercel Analytics |
| **AWS 통합** | ✅ 완벽 | ❌ 제한적 |
| **설정 복잡도** | 보통 | 쉬움 |
| **추천 대상** | AWS 생태계 사용자 | Next.js 초보자 |

#### 📚 추가 리소스

- [AWS Amplify 공식 문서](https://docs.amplify.aws/)
- [Next.js on Amplify](https://docs.amplify.aws/guides/hosting/nextjs/)
- [amplify.yml 레퍼런스](https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html)

---

### Amplify 빠른 시작 체크리스트

```bash
1. [ ] AWS 계정 생성
2. [ ] GitHub에 코드 푸시
3. [ ] Amplify Console 접속
4. [ ] GitHub 연결
5. [ ] 브랜치 선택 (main)
6. [ ] amplify.yml 확인
7. [ ] 배포 시작
8. [ ] URL 접속 테스트
9. [ ] API 작동 확인
10. [ ] 커스텀 도메인 연결 (선택)
```

**예상 소요 시간: 10-15분**

### Google Cloud Run 배포

**서버리스 컨테이너 플랫폼 (Google Cloud 공식)**

Google Cloud Run은 Docker 컨테이너를 서버리스로 실행하는 플랫폼으로, Next.js SSR을 완벽하게 지원합니다.

#### 🎯 Cloud Run의 장점

- ✅ **완전한 컨테이너 지원**: Docker 기반, 무한한 확장성
- ✅ **자동 스케일링**: 0 → N 인스턴스 자동 조정
- ✅ **종량제 과금**: 실제 사용한 만큼만 청구
- ✅ **글로벌 배포**: Google Cloud 리전 선택 가능
- ✅ **CI/CD 통합**: Cloud Build 자동 연동
- ✅ **커스텀 도메인**: 무료 SSL 인증서
- ✅ **환경 변수**: Secret Manager 통합
- ✅ **무료 티어**: 월 200만 요청 무료

#### 📋 사전 준비

1. **Google Cloud 계정**: https://cloud.google.com/
2. **gcloud CLI 설치**: https://cloud.google.com/sdk/docs/install
3. **Docker 설치**: https://docs.docker.com/get-docker/
4. **프로젝트 ID**: GCP 프로젝트 생성 필요
5. **Dockerfile**: 프로젝트 루트에 위치 (이미 포함됨)

#### 🚀 배포 절차

##### 1단계: gcloud CLI 설치 및 로그인

```bash
# gcloud CLI 설치 확인
gcloud --version

# 설치되지 않았다면 설치
# macOS
brew install --cask google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash

# 로그인
gcloud auth login

# 프로젝트 설정
gcloud config set project YOUR_PROJECT_ID

# Cloud Run API 활성화
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

##### 2단계: 프로젝트 설정 확인

```bash
# 현재 설정 확인
gcloud config list

# 출력 예시:
# [core]
# account = your-email@gmail.com
# project = your-project-id
# region = asia-northeast3  # 서울 리전
```

##### 3단계: Dockerfile 확인

프로젝트 루트의 `Dockerfile`이 이미 Cloud Run용으로 최적화되어 있습니다:

```dockerfile
# Cloud Run용 Next.js Dockerfile (standalone 빌드)
FROM node:20-alpine AS base

# 의존성 설치
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# 빌드
FROM base AS builder
WORKDIR /app
COPY . .
RUN npm run build

# 러너 이미지
FROM base AS runner
WORKDIR /app

# 사용자/그룹 설정 (보안)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# standalone 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["node", "server.js"]
```

**핵심 포인트:**
- ✅ `output: 'standalone'` 설정 필요 (next.config.ts에 이미 설정됨)
- ✅ Multi-stage build로 이미지 크기 최소화
- ✅ 비 root 사용자로 실행 (보안)
- ✅ PORT 환경 변수 지원 (Cloud Run 필수)

##### 4단계: 로컬 Docker 테스트 (선택사항)

```bash
# Docker 이미지 빌드
docker build -t next-ts-hands-on .

# 로컬 실행
docker run -p 3000:3000 next-ts-hands-on

# 브라우저에서 확인
open http://localhost:3000

# 확인 후 종료
docker stop $(docker ps -q --filter ancestor=next-ts-hands-on)
```

##### 5단계: Cloud Run 배포 (방법 1 - 간편)

```bash
# 프로젝트 루트에서 실행
gcloud run deploy next-ts-hands-on \
  --source . \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated

# 대화형 프롬프트:
# - Service name: next-ts-hands-on (엔터)
# - Region: asia-northeast3 (서울) 선택
# - Allow unauthenticated: Yes

# 배포 완료 (3-5분 소요)
```

**`--source .` 옵션:**
- 현재 디렉토리의 소스 코드를 Cloud Build로 자동 빌드
- Dockerfile 자동 감지
- Container Registry에 이미지 저장
- Cloud Run에 자동 배포

##### 5단계: Cloud Run 배포 (방법 2 - 수동)

더 세밀한 제어가 필요한 경우:

```bash
# 1. Google Container Registry에 이미지 빌드 및 푸시
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/next-ts-hands-on

# 2. Cloud Run에 배포
gcloud run deploy next-ts-hands-on \
  --image gcr.io/YOUR_PROJECT_ID/next-ts-hands-on \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0
```

##### 6단계: 배포 확인

```bash
# 배포 완료 후 출력:
Service [next-ts-hands-on] revision [next-ts-hands-on-00001-abc] has been deployed.
Service URL: https://next-ts-hands-on-xxxxx-an.a.run.app

# 브라우저에서 접속
open https://next-ts-hands-on-xxxxx-an.a.run.app
```

#### 🔍 배포 확인 체크리스트

```bash
# 1. 서비스 상태 확인
gcloud run services describe next-ts-hands-on --region asia-northeast3

# 2. 브라우저 테스트
# ✅ 포스트 5개 즉시 표시 (SSR)
# ✅ 좋아요 버튼 작동 (API Route)
# ✅ About 페이지 이동
# ✅ F12 > Console: 에러 없음

# 3. API 테스트
curl https://next-ts-hands-on-xxxxx-an.a.run.app/api/likes?postId=1
{
  "postId": "1",
  "likes": 0,
  "message": "서버에서 좋아요 수를 조회했습니다."
}

# 4. 로그 확인
gcloud run services logs read next-ts-hands-on --region asia-northeast3
```

#### ⚙️ 고급 설정

##### 환경 변수 추가

```bash
# 환경 변수와 함께 배포
gcloud run deploy next-ts-hands-on \
  --source . \
  --region asia-northeast3 \
  --set-env-vars "NEXT_PUBLIC_API_URL=https://api.example.com,NODE_ENV=production"

# Secret Manager 사용 (민감한 정보)
# 1. Secret 생성
echo -n "your-database-url" | gcloud secrets create DATABASE_URL --data-file=-

# 2. Cloud Run에서 사용
gcloud run deploy next-ts-hands-on \
  --source . \
  --region asia-northeast3 \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest"
```

##### 커스텀 도메인 연결

```bash
# 1. 도메인 매핑 생성
gcloud run domain-mappings create \
  --service next-ts-hands-on \
  --domain example.com \
  --region asia-northeast3

# 2. DNS 레코드 추가 (출력된 값 사용)
# Type: CNAME
# Name: www
# Value: ghs.googlehosted.com

# 3. 검증 대기 (최대 24시간)
gcloud run domain-mappings describe --domain example.com --region asia-northeast3
```

##### 리소스 제한 설정

```bash
# CPU 및 메모리 설정
gcloud run deploy next-ts-hands-on \
  --source . \
  --region asia-northeast3 \
  --memory 1Gi \
  --cpu 2 \
  --timeout 300s \
  --max-instances 100 \
  --min-instances 1 \
  --concurrency 80

# 설정 설명:
# --memory: 컨테이너 메모리 (128Mi ~ 32Gi)
# --cpu: CPU 개수 (1, 2, 4, 8)
# --timeout: 요청 타임아웃 (최대 3600초)
# --max-instances: 최대 인스턴스 수
# --min-instances: 최소 인스턴스 수 (항상 실행, 비용 발생)
# --concurrency: 인스턴스당 동시 요청 수
```

##### CI/CD 자동 배포 (Cloud Build)

`cloudbuild.yaml` 파일 생성:

```yaml
steps:
  # 의존성 설치 및 빌드
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/next-ts-hands-on'
      - '.'

  # Container Registry에 푸시
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/next-ts-hands-on'

  # Cloud Run에 배포
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'next-ts-hands-on'
      - '--image'
      - 'gcr.io/$PROJECT_ID/next-ts-hands-on'
      - '--region'
      - 'asia-northeast3'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'

images:
  - 'gcr.io/$PROJECT_ID/next-ts-hands-on'

options:
  machineType: 'E2_HIGHCPU_8'
```

```bash
# Cloud Build 트리거 생성
gcloud builds triggers create github \
  --repo-name=next-ts-hands-on \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

#### 🐛 문제 해결

##### 빌드 실패

```bash
# 증상: Docker 빌드 실패

# 해결:
# 1. 로컬에서 빌드 테스트
docker build -t test .

# 2. 로그 확인
gcloud builds list --limit 5
gcloud builds log BUILD_ID

# 3. 일반적인 에러:
# - "npm ERR!" → package.json 확인
# - "COPY failed" → .dockerignore 확인
# - "Out of memory" → --machine-type 변경
gcloud builds submit --machine-type=E2_HIGHCPU_8 --tag gcr.io/PROJECT_ID/app
```

##### 배포 후 502/503 에러

```bash
# 증상: 서비스 접속 시 502/503

# 원인 1: PORT 환경 변수 미설정
# 해결: Dockerfile에서 PORT 설정 확인
ENV PORT=3000

# 원인 2: 헬스 체크 실패
# 해결: 서비스가 0.0.0.0에서 리스닝하는지 확인
ENV HOST=0.0.0.0

# 원인 3: 시작 시간 초과
# 해결: 타임아웃 늘리기
gcloud run services update next-ts-hands-on \
  --timeout 300 \
  --region asia-northeast3
```

##### 콜드 스타트 지연

```bash
# 증상: 첫 요청이 느림 (5-10초)

# 해결 1: 최소 인스턴스 설정 (항상 1개 실행)
gcloud run services update next-ts-hands-on \
  --min-instances 1 \
  --region asia-northeast3

# 해결 2: 빌드 최적화
# Dockerfile에서 이미지 크기 줄이기
# - Alpine Linux 사용 (이미 적용됨)
# - Multi-stage build (이미 적용됨)
# - .dockerignore 활용

# 해결 3: CPU 부스트 활성화
gcloud run services update next-ts-hands-on \
  --cpu-boost \
  --region asia-northeast3
```

##### API Routes 작동 안 함

```bash
# 증상: /api/likes 404 Not Found

# 해결:
# 1. next.config.ts 확인
...(!isStaticExport && {
  output: 'standalone',  // ← 이 설정 필수
})

# 2. 환경 변수 확인
gcloud run services describe next-ts-hands-on --region asia-northeast3 --format="value(spec.template.spec.containers[0].env)"

# STATIC_EXPORT가 설정되어 있으면 제거
gcloud run services update next-ts-hands-on \
  --remove-env-vars STATIC_EXPORT \
  --region asia-northeast3

# 3. 재빌드 및 배포
gcloud run deploy next-ts-hands-on --source . --region asia-northeast3
```

#### 📊 비용 안내

**Cloud Run 무료 티어 (월간):**
- ✅ 컴퓨팅: 200만 요청
- ✅ CPU 시간: 360,000 vCPU-초
- ✅ 메모리: 180,000 GiB-초
- ✅ 네트워크: 1GB 송신
- ✅ 무료 SSL 인증서

**예상 사용량 (소규모 프로젝트):**
- 요청: ~10,000 요청/월
- CPU 시간: ~5,000 vCPU-초/월
- 메모리: ~10,000 GiB-초/월
- 비용: **$0/월** (무료 티어 내)

**초과 시 비용 (asia-northeast3):**
- 요청: $0.40/100만 요청
- CPU: $0.00002400/vCPU-초
- 메모리: $0.00000250/GiB-초
- 네트워크: $0.12/GB

**실제 예시 (월 10만 요청, 평균 응답 1초):**
```
요청 비용: (100,000 - 2,000,000) × $0.40/1,000,000 = $0 (무료)
CPU 비용: (100,000초 × 1 CPU - 360,000) × $0.000024 = $0 (무료)
메모리 비용: (100,000초 × 0.5 GiB - 180,000) × $0.0000025 = $0 (무료)
총 비용: $0/월
```

**비용 절감 팁:**
- 최소 인스턴스 0으로 설정 (사용 안 할 때 비용 없음)
- 적절한 메모리/CPU 설정 (512Mi, 1 CPU 권장)
- 요청 타임아웃 최소화
- 캐싱 활용 (CDN, Redis)
- 리전 선택 (asia-northeast3 서울이 저렴)

#### 🔄 CI/CD 워크플로우

```
Git Push (main)
    ↓
Cloud Build 트리거
    ↓
┌──────────────────────┐
│ 1. 소스 코드 가져오기 │
│ 2. Docker 빌드        │
│ 3. GCR에 푸시         │
│ 4. Cloud Run 배포     │
│ 5. 헬스 체크          │
└──────────────────────┘
    ↓
이메일/Slack 알림
    ↓
배포 완료!
```

#### 🎯 Cloud Run vs Amplify vs Vercel 비교

| 항목 | Cloud Run | AWS Amplify | Vercel |
|------|-----------|-------------|--------|
| **배포 방식** | Docker 컨테이너 | Git 기반 | Git 기반 |
| **설정 복잡도** | 보통-높음 | 보통 | 쉬움 |
| **자동 스케일링** | ✅ 0→N | ✅ 있음 | ✅ 있음 |
| **콜드 스타트** | 5-10초 | 없음 (항상 실행) | 없음 |
| **무료 티어** | 200만 요청 | 1,000분 빌드 | 무제한 빌드 |
| **최소 인스턴스** | 설정 가능 | 없음 | 없음 |
| **컨테이너 제어** | ✅ 완전 제어 | ❌ 제한적 | ❌ 제한적 |
| **GCP 통합** | ✅ 완벽 | ❌ 없음 | ❌ 제한적 |
| **비용 예측** | 종량제 | 고정+종량 | 고정+종량 |
| **추천 대상** | DevOps, GCP 사용자 | AWS 사용자 | 초보자 |

#### 📚 추가 리소스

- [Cloud Run 공식 문서](https://cloud.google.com/run/docs)
- [Next.js on Cloud Run](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service)
- [Cloud Build 설정](https://cloud.google.com/build/docs/configuring-builds/create-basic-configuration)
- [비용 계산기](https://cloud.google.com/products/calculator)

---

### Cloud Run 빠른 시작 체크리스트

```bash
# 사전 준비
1. [ ] Google Cloud 계정 생성
2. [ ] gcloud CLI 설치
3. [ ] Docker 설치
4. [ ] GCP 프로젝트 생성
5. [ ] Cloud Run API 활성화

# 배포
6. [ ] gcloud auth login
7. [ ] gcloud config set project PROJECT_ID
8. [ ] next.config.ts에서 output: 'standalone' 확인
9. [ ] gcloud run deploy --source .
10. [ ] 배포 URL 접속 테스트

# 확인
11. [ ] SSR 포스트 즉시 표시
12. [ ] API Routes 작동
13. [ ] 좋아요 기능 정상
14. [ ] 로그 확인

# 최적화 (선택)
15. [ ] 커스텀 도메인 연결
16. [ ] 환경 변수 설정
17. [ ] 리소스 제한 조정
18. [ ] CI/CD 파이프라인 구축
```

**예상 소요 시간: 20-30분**

**추천 설정 (소규모 프로젝트):**
```bash
gcloud run deploy next-ts-hands-on \
  --source . \
  --region asia-northeast3 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0 \
  --allow-unauthenticated
```

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
- **2025-10-26**: AWS Amplify 배포 가이드 추가
  - 완전한 배포 절차 (6단계)
  - amplify.yml 설정 파일 추가
  - 고급 설정 (커스텀 도메인, 환경 변수, 브랜치 배포)
  - 문제 해결 가이드 (빌드 실패, API Routes, 성능 최적화)
  - 비용 안내 및 CI/CD 워크플로우 설명
  - Amplify vs Vercel 비교표 추가
- **2025-10-26**: Google Cloud Run 배포 가이드 추가
  - 완전한 배포 절차 (6단계)
  - Dockerfile 및 .dockerignore 최적화
  - gcloud CLI 설정 및 사용법
  - 고급 설정 (환경 변수, Secret Manager, 커스텀 도메인, 리소스 제한)
  - CI/CD 자동 배포 (cloudbuild.yaml)
  - 문제 해결 가이드 (빌드 실패, 502/503 에러, 콜드 스타트)
  - 비용 안내 (무료 티어, 실제 예시)
  - Cloud Run vs Amplify vs Vercel 비교표

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
