'use client';
import { useState, useEffect } from 'react';
import { Post } from '@/types';
import PostItem from './PostItem';
import Link from 'next/link';

async function fetchPosts(): Promise<Post[]> {
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5', {
      next: { revalidate: 0 },  // 매 로드 시 새 데이터 (캐싱 무시)
    });
    if (!res.ok) throw new Error('Failed to fetch posts');
    return res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default function ClientHomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPosts() {
      setLoading(true);
      const data = await fetchPosts();
      setPosts(data);
      setLoading(false);
    }
    loadPosts();
  }, []);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-8">
        <h1 className="text-5xl font-extrabold text-center mb-10 text-gray-900">
          Next.js + TypeScript 실습
        </h1>
        <p className="text-center text-gray-500">포스트를 불러오는 중...</p>
      </main>
    );
  }

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
          <p className="text-center text-gray-500">포스트를 불러오지 못했습니다.</p>
        )}
      </div>
    </main>
  );
}
