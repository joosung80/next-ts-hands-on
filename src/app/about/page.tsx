// src/app/about/page.tsx

import Link from 'next/link';

/**
 * (1) 'src/app/about' 폴더에 'page.tsx' 파일을 생성했습니다.
 * 이것만으로 Next.js는 자동으로 '/about' URL 경로를 생성합니다.
 * React Router의 <Route path="/about" ...> 코드가 필요 없습니다.
 */
export default function AboutPage() {
  return (
    <main className="max-w-4xl mx-auto p-8 text-center">
      <h1 className="text-5xl font-extrabold mb-10 text-gray-900">
        소개 페이지
      </h1>
      <p className="text-xl text-gray-700 mb-12">
        이 페이지는 React Router의 수동 설정 없이,
        단순히 `src/app/about/page.tsx` 파일을 생성하는 것만으로 만들어졌습니다.
      </p>
      {/* (2) 메인 페이지로 돌아가는 링크 */}
      <Link href="/" className="text-blue-600 hover:underline text-lg">
        홈으로 가기
      </Link>
    </main>
  );
}
