// src/app/page.tsx

import { Post } from '@/types';
import PostItem from '@/app/components/PostItem';
import Link from 'next/link'; // (1) 페이지 이동을 위한 Link 컴포넌트

/**
 * (2) 외부 API에서 데이터를 가져오는 비동기 함수입니다.
 * 서버 컴포넌트에서는 fetch를 직접 사용할 수 있습니다.
 * * 📌 현재 상태: Dynamic Route (SSR) - GitHub Pages 배포 불가 ❌
 * - 'cache: no-store' 때문에 요청마다 서버에서 HTML 생성
 * * 🔧 GitHub Pages 배포를 위한 Static 변환 옵션:
 * * [옵션 1] 완전 Static - 빌드 시점에 데이터 고정 (추천)
 * - 'cache: no-store' 제거 또는 'cache: force-cache'로 변경
 * - 동작: 빌드 시 API 호출 → HTML 생성 → 모든 사용자에게 동일 HTML 제공
 * - 장점: 초고속, GitHub Pages 배포 가능 ✅
 * - 단점: 빌드 후 데이터 갱신 안 됨 (재빌드 필요)
 * * [옵션 2] ISR (Incremental Static Regeneration) - Vercel 등 서버 필요
 * - next: { revalidate: 3600 } 설정 (예: 1시간마다 재생성)
 * - 동작: 빌드 시 HTML 생성 → 주기적으로 백그라운드 갱신
 * - 장점: Static 속도 + 최신 데이터
 * - 단점: GitHub Pages 불가 ❌ (Vercel, AWS 등에서만 가능)
 * * [옵션 3] 클라이언트 사이드 Fetching - 브라우저에서 데이터 로딩
 * - 'use client' 선언 + useEffect로 fetch
 * - 동작: 빌드 시 빈 HTML 생성 → 브라우저에서 API 호출 → 데이터 렌더링
 * - 장점: 항상 최신 데이터, GitHub Pages 배포 가능 ✅
 * - 단점: 초기 로딩 느림, SEO 불리
 */
async function getPosts(): Promise<Post[]> {
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5', {
      cache: 'no-store', // 항상 최신 데이터를 가져오도록 SSR 설정 (Dynamic)
      
      // 옵션 1: GitHub Pages 배포용 Static 설정
      // cache: 'force-cache', // 또는 이 줄 자체를 제거
      
      // 옵션 2: ISR 설정 (Vercel 등에서만 가능)
      // next: { revalidate: 3600 }, // 1시간(3600초)마다 재생성
    });
    if (!res.ok) throw new Error('Failed to fetch posts');
    return res.json();
  } catch (error) {
    console.error(error);
    return []; // 에러 발생 시 빈 배열 반환
  }
}

/**
 * (3) 메인 페이지 컴포넌트입니다.
 * 'use client'가 없으므로 서버 컴포넌트이며, async/await를 사용할 수 있습니다.
 */
export default async function HomePage() {
  
  // (4) 서버에서 직접 데이터를 가져옵니다.
  const posts = await getPosts();

  return (
    // (5) Tailwind CSS 클래스를 사용해 메인 레이아웃을 잡습니다.
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-5xl font-extrabold text-center mb-10 text-gray-900">
        Next.js + TypeScript 실습
      </h1>
      
      {/* (6) /about 경로로 이동하는 링크 추가 */}
      <div className="text-center mb-10">
        <Link href="/about" className="text-blue-600 hover:underline text-lg">
          소개 페이지로 가기
        </Link>
      </div>
      
      <div className="space-y-6">
        {posts.length > 0 ? (
          posts.map((post) => (
            <PostItem key={post.id} post={post} />
          ))
        ) : (
          <p className="text-center text-gray-500">포스트를 불러오지 못했습니다.</p>
        )}
      </div>
    </main>
  );
}
