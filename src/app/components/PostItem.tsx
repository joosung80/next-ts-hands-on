// src/app/components/PostItem.tsx

import { Post } from '@/types'; // (1) 정의해둔 Post 타입을 가져옵니다.
import LikeButton from './LikeButton';

// (2) Props의 타입을 Post 인터페이스로 지정합니다.
type PostItemProps = {
  post: Post;
};

/**
 * 이 컴포넌트는 'use client' 선언이 없습니다.
 * 따라서 기본적으로 서버 컴포넌트(RSC)로 동작합니다.
 * * 💡 서버 컴포넌트와 클라이언트 컴포넌트의 조합:
 * - PostItem: 서버 컴포넌트 (정적 콘텐츠 렌더링)
 * - LikeButton: 클라이언트 컴포넌트 (인터랙티브, API 호출)
 * - 이렇게 조합하면 최적의 성능과 사용자 경험을 얻을 수 있습니다.
 */
export default function PostItem({ post }: PostItemProps) {
  return (
    // (3) Tailwind CSS로 스타일링된 article
    <article className="p-6 bg-white border border-gray-200 rounded-xl shadow-md space-y-3">
      <h2 className="text-2xl font-bold text-gray-800 capitalize">
        {post.title}
      </h2>
      <p className="text-gray-600">{post.body}
      </p>
      
      {/* (4) 서버 컴포넌트 안에서 클라이언트 컴포넌트를 자연스럽게 조합합니다. */}
      {/* postId를 전달해서 각 포스트별로 독립적인 좋아요 수를 관리합니다. */}
      <LikeButton postId={post.id} />
    </article>
  );
}
