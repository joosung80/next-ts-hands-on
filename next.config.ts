import type { NextConfig } from "next";

const isStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig: NextConfig = {
  ...(isStaticExport && {
    output: 'export',
    basePath: '/next-ts-hands-on',
    assetPrefix: '/next-ts-hands-on',
    trailingSlash: true,
    images: { unoptimized: true },
  }),
  ...(!isStaticExport && {
    output: 'standalone',  // Cloud Run 등 컨테이너 배포 호환 (동적 모드)
  }),
  /* config options here */
};

export default nextConfig;
