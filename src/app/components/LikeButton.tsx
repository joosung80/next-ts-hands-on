// src/app/components/LikeButton.tsx

"use client";

import { useState, useEffect } from 'react';

/**
 * LikeButton: API Route를 호출하는 클라이언트 컴포넌트
 * * 📌 현재 구현: /api/likes 엔드포인트와 통신
 * - GET: 서버에서 좋아요 수 조회
 * - POST: 서버에 좋아요 증가 요청
 * * 💡 서버/클라이언트 통신 흐름:
 * 1. 컴포넌트 마운트 → useEffect 실행 → GET /api/likes?postId=X
 * 2. 버튼 클릭 → handleClick 실행 → POST /api/likes
 * 3. 서버 응답 → 상태 업데이트 → UI 리렌더링
 * * 🚫 GitHub Pages 배포 시 문제점:
 * - API Routes가 작동하지 않아 fetch 실패 ❌
 * - 에러: "Failed to fetch" 또는 404 Not Found
 * * 🔧 GitHub Pages 배포를 위한 대응 전략:
 * * [전략 1] 별도 API 서버로 요청 변경
 * - fetch('/api/likes') → fetch('https://your-api.vercel.app/api/likes')
 * - 백엔드를 Vercel, Netlify 등에 별도 배포
 * - CORS 설정 필요 (Access-Control-Allow-Origin)
 * * [전략 2] localStorage로 클라이언트 전용 상태 관리
 * - API 호출 제거
 * - localStorage.getItem/setItem으로 브라우저에 저장
 * - 장점: 별도 서버 불필요
 * - 단점: 사용자 간 데이터 공유 불가 (개인 디바이스에만 저장)
 * * [전략 3] BaaS 직접 호출
 * - Supabase/Firebase 클라이언트를 직접 사용
 * - API Routes 없이 클라이언트 → BaaS 직접 통신
 * - Row Level Security로 보안 처리
 * * [전략 4] Next.js를 Vercel에 배포 (권장)
 * - 코드 변경 없이 그대로 작동 ✅
 * - GitHub 연동 자동 배포
 */

type LikeButtonProps = {
  postId: number; // 어떤 포스트의 좋아요인지 구분
};

export default function LikeButton({ postId }: LikeButtonProps) {
  
  // (2) useState를 사용해 '좋아요' 상태를 관리합니다.
  const [likes, setLikes] = useState<number>(0);  // 초기값 0으로 단순화
  const [isLoading, setIsLoading] = useState(false);  // 하나의 로딩 상태로 통합

  // 빌드 타임에 결정되는 모드 (static export vs dynamic)
  // 클라이언트 컴포넌트에서는 NEXT_PUBLIC_ 접두사 필요
  const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';
  const storageKey = `likes_${postId}`;

  // 서버에서 좋아요 수 조회
  const fetchLikes = async () => {
    try {
      const response = await fetch(`/api/likes?postId=${postId}`);
      if (response.ok) {
        const data = await response.json();
        setLikes(data.likes);
      }
    } catch (error) {
      console.error('좋아요 수 조회 실패:', error);
    }
  };

  // (3) 컴포넌트가 마운트될 때 서버에서 좋아요 수를 가져옵니다.
  useEffect(() => {
    if (isStatic) {
      // 정적 모드: localStorage에서 로드
      const savedLikes = localStorage.getItem(storageKey);
      if (savedLikes !== null) {
        setLikes(parseInt(savedLikes, 10));
      }
    } else {
      // 동적 모드: API 호출
      fetchLikes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, isStatic, storageKey]);

  // 좋아요 버튼 클릭 핸들러
  const handleClick = async () => {
    setIsLoading(true);
    
    if (isStatic) {
      // 정적 모드: localStorage 업데이트
      const newLikes = likes + 1;
      setLikes(newLikes);
      localStorage.setItem(storageKey, newLikes.toString());
      console.log(`LocalStorage updated for post ${postId}: ${newLikes} likes`);
      setIsLoading(false);  // localStorage는 동기이므로 즉시 완료
    } else {
      // 동적 모드: API 호출
      try {
        const response = await fetch('/api/likes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ postId: postId.toString() }),
        });

        if (response.ok) {
          const data = await response.json();
          // (5) 서버에서 받은 새 좋아요 수로 상태를 업데이트합니다.
          setLikes(data.likes);
        } else {
          console.error('좋아요 증가 실패');
        }
      } catch (error) {
        console.error('API 호출 에러:', error);
        // GitHub Pages 배포 시 여기서 에러 발생
        // 대안: localStorage 사용하거나 에러 메시지 표시
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      // (6) Tailwind CSS 클래스를 사용해 스타일링합니다.
      // min-w-[140px]로 최소 너비 고정 → 크기 변화 방지
      // relative로 로딩 스피너 절대 위치 지정 가능
      className="relative min-w-[140px] px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* 로딩 중에도 텍스트 유지하고 투명도로 표시 */}
      <span className={isLoading ? 'opacity-50' : 'opacity-100'}>
        👍 좋아요 ({likes})
      </span>
      
      {/* 로딩 스피너 오버레이 (선택사항) */}
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="animate-spin">⏳</span>
        </span>
      )}
    </button>
  );
}
