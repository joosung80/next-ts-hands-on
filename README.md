This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy

### Vercel (추천)

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

```bash
# 1. GitHub에 푸시
git push origin main

# 2. Vercel 연동
# https://vercel.com/ → Import Project

# 3. 자동 배포 완료
```

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### AWS Amplify

AWS 생태계를 사용한다면 Amplify가 좋은 선택입니다.

```bash
# 1. AWS Amplify Console 접속
# https://console.aws.amazon.com/amplify/

# 2. GitHub 연동 및 브랜치 선택

# 3. 자동 빌드 및 배포
```

자세한 내용은 [Dynamic Deployment Guide](docs/DYNAMIC_DEPLOYMENT_GUIDE.md#aws-amplify-배포)를 참조하세요.

### GitHub Pages (정적 배포)

정적 사이트로 무료 배포가 가능합니다.

```bash
# 1. 정적 빌드
npm run build:static

# 2. GitHub Pages 배포
npm run deploy:static
```

자세한 내용은 [Static Deployment Guide](docs/STATIC_DEPLOYMENT_GUIDE.md)를 참조하세요.

## 배포 가이드

- **동적 배포** (SSR, API Routes): [DYNAMIC_DEPLOYMENT_GUIDE.md](docs/DYNAMIC_DEPLOYMENT_GUIDE.md)
  - Vercel
  - AWS Amplify
  - Google Cloud Run

- **정적 배포** (Static Export): [STATIC_DEPLOYMENT_GUIDE.md](docs/STATIC_DEPLOYMENT_GUIDE.md)
  - GitHub Pages
  - Netlify
  - AWS S3

## 프로젝트 구조

```
next-ts-hands-on/
├── src/
│   ├── app/
│   │   ├── api/likes/       # API Routes
│   │   ├── components/      # React 컴포넌트
│   │   ├── about/           # About 페이지
│   │   └── page.tsx         # 홈 페이지 (SSR/CSR 조건부)
│   └── types/               # TypeScript 타입 정의
├── docs/                    # 배포 가이드 문서
├── amplify.yml              # AWS Amplify 설정
└── next.config.ts           # Next.js 설정 (정적/동적 전환)
```
