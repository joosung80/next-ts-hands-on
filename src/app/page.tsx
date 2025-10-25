// src/app/page.tsx

import { Post } from '@/types';
import PostItem from './components/PostItem';
import Link from 'next/link';
import ClientHomePage from './components/ClientHomePage';  // Static CSR 컴포넌트

/**
 * 서버/클라이언트 공통 fetch 함수.
 * Dynamic: 서버 fetch (SSR).
 * Static: 클라이언트 fetch (ClientHomePage에서 호출).
 */
async function fetchPosts(): Promise<Post[]> {
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5');
    if (!res.ok) throw new Error('Failed to fetch posts');
    return res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Dynamic 모드: 서버 컴포넌트 (SSR fetch)
async function ServerHomePage() {
  const posts = await fetchPosts();

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-5xl font-extrabold text-center mb-10 text-gray-900">
        Next.js + TypeScript 실습
      </h1>
      
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
          <ClientHomePage />  // Fallback: Static CSR
        )}
      </div>
    </main>
  );
}

// 조건부 렌더링: Dynamic SSR vs Static CSR
const isStatic = process.env.STATIC_EXPORT === 'true';

export default isStatic ? ClientHomePage : ServerHomePage;
