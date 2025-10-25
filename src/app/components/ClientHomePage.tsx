'use client';
import { useState, useEffect } from 'react';
import { Post } from '@/types';
import PostItem from './PostItem';
import Link from 'next/link';

async function fetchPosts(): Promise<Post[]> {
  console.log('Starting fetch for posts...');
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5', {
      next: { revalidate: 0 },  // 매 로드 시 새 데이터
    });
    console.log('Fetch response status:', res.status);
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Response Error:', res.status, errorText);
      throw new Error(`API failed: ${res.status}`);
    }
    const data = await res.json();
    console.log('Fetched posts successfully:', data.length, data.slice(0, 1));  // 첫 번째 데이터 미리보기
    return data;
  } catch (error) {
    console.error('Fetch error details:', error);
    return [];
  }
}

export default function ClientHomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('ClientHomePage mounted, loading posts...');
    async function loadPosts() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPosts();
        setPosts(data);
        if (data.length === 0) {
          setError('API에서 데이터를 가져왔으나 포스트가 없습니다. 콘솔을 확인하세요.');
          console.warn('Empty posts array from API.');
        }
      } catch (error) {
        console.error('LoadPosts error:', error);
        setError('포스트를 불러오지 못했습니다. F12 콘솔에서 에러를 확인하세요. (네트워크나 API 문제 가능)');
      } finally {
        setLoading(false);
      }
    }
    loadPosts();
  }, []);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-8">
        <h1 className="text-5xl font-extrabold text-center mb-10 text-gray-900">
          Next.js + TypeScript 실습
        </h1>
        <p className="text-center text-gray-500">포스트를 불러오는 중... (F12 콘솔 확인)</p>
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
          <p className="text-center text-gray-500">{error || '포스트를 불러오지 못했습니다. 콘솔을 확인하세요.'}</p>
        )}
      </div>
    </main>
  );
}
