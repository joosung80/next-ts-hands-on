// src/types/index.ts

/** API에서 받아올 포스트 데이터의 타입을 정의합니다. */
export interface Post {
    userId: number;
    id: number;
    title: string;
    body: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      STATIC_EXPORT: string;
      NEXT_PUBLIC_API_URL?: string;
    }
  }
}

export {};
