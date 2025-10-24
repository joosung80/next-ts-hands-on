import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Next.js TS 실습',
  description: '서버/클라이언트 컴포넌트 실습',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      {/* (1) body와 그 안의 div에 Tailwind 클래스를 지정합니다. */}
      <body className={inter.className} suppressHydrationWarning>
        <div className="bg-gray-50 text-gray-900 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
