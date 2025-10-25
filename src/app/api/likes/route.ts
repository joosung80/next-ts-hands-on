// src/app/api/likes/route.ts

import { NextResponse } from 'next/server';

/**
 * API Route: /api/likes
 * * (1) 'src/app/api/likes' 폴더에 'route.ts' 파일을 생성했습니다.
 * 이것만으로 Next.js는 자동으로 '/api/likes' API 엔드포인트를 생성합니다.
 * Express.js의 'app.get('/api/likes', ...)' 코드가 필요 없습니다.
 * * (2) 이 함수는 서버에서만 실행됩니다.
 * 여기에 Supabase 보안 키를 넣고 DB와 통신하면 됩니다.
 * * 📌 현재 구현: 좋아요 수를 메모리에 저장 (간단한 예제)
 * - 실제 프로젝트에서는 데이터베이스(Supabase, PostgreSQL 등)에 저장해야 합니다.
 * - 서버 재시작 시 데이터가 초기화됩니다.
 * * 🚫 GitHub Pages 배포 시 문제점:
 * - GitHub Pages는 정적 호스팅만 지원 (서버리스 함수 미지원)
 * - API Routes는 작동하지 않습니다 ❌
 * * 🔧 GitHub Pages 배포를 위한 대응 전략:
 * * [전략 1] 별도 백엔드 API 서버 배포 (추천)
 * - Vercel, Netlify, AWS Lambda 등에 API만 따로 배포
 * - 프론트엔드: GitHub Pages (https://username.github.io/project)
 * - 백엔드: Vercel (https://project-api.vercel.app)
 * - CORS 설정 필요
 * * [전략 2] 클라이언트 전용 상태 관리
 * - API 호출 제거, localStorage나 클라이언트 상태만 사용
 * - 장점: 별도 서버 불필요
 * - 단점: 새로고침 시 다른 사용자 데이터 공유 불가
 * * [전략 3] BaaS(Backend as a Service) 사용
 * - Supabase, Firebase 등 직접 호출
 * - API Routes 거치지 않고 클라이언트에서 직접 호출
 * - 주의: API 키 노출 방지 (Row Level Security 설정 필수)
 * * [전략 4] Next.js 전체를 Vercel에 배포 (가장 간단)
 * - GitHub Pages 대신 Vercel 사용
 * - API Routes 그대로 작동 ✅
 * - 무료 플랜 제공
 */

// 메모리에 좋아요 수 저장 (실제로는 데이터베이스 사용)
// postId를 키로, 좋아요 수를 값으로 저장
const likesStore = new Map<string, number>();

// Static Export 호환성을 위해 추가 (빌드 에러 방지)
// Static export 시: API 무시되지만 빌드 통과
// Dynamic 모드 시: 정상 API 동작
export const dynamic = 'force-static';

/**
 * GET 요청: 특정 포스트의 좋아요 수 조회
 * 사용 예: GET /api/likes?postId=1
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
  
  const likes = likesStore.get(postId) || 0;
  
  return NextResponse.json({ 
    postId,
    likes,
    message: '서버에서 좋아요 수를 조회했습니다.'
  });
}

/**
 * POST 요청: 좋아요 증가
 * 사용 예: POST /api/likes { postId: "1" }
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
    
    // 현재 좋아요 수 가져오기
    const currentLikes = likesStore.get(postId) || 0;
    const newLikes = currentLikes + 1;
    
    // 좋아요 수 업데이트
    likesStore.set(postId, newLikes);
    
    // 실제 프로젝트에서는 아래처럼 데이터베이스에 저장:
    // const { data } = await supabase
    //   .from('post_likes')
    //   .upsert({ post_id: postId, likes: newLikes });
    
    return NextResponse.json({ 
      postId,
      likes: newLikes,
      message: '좋아요가 증가했습니다.'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
