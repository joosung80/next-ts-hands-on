# Changelog

## 2025-10-25 - 좋아요 기능 개선 및 간소화

### 🐛 버그 수정
- **좋아요 숫자 리셋 문제 해결**: 페이지 간 이동(Home ↔ About) 후 좋아요 숫자가 0으로 리셋되던 문제 수정
  - `useState<number | null>(null)` 초기값 변경으로 로딩 상태 명확화
  - `isLoadingData` 상태 추가로 초기 데이터 로딩 중 "..." 표시
  - `useEffect` 의존성 배열에 `postId` 추가로 매 마운트 시 최신 데이터 fetch

### 📝 개선 사항
- **API Route 설정 간소화**:
  - 자동화 스크립트(`scripts/update-dynamic.js`) 제거
  - 사용자가 배포 모드에 따라 수동으로 `export const dynamic` 설정
  - `route.ts`에 명확한 주석 추가:
    ```typescript
    /**
     * ⚙️ 배포 모드에 따라 수동으로 변경하세요:
     * 
     * 🔹 Dynamic 모드 (Vercel, AWS, Cloud Run 등):
     *    export const dynamic = 'force-dynamic';
     *    → API Route가 정상 작동합니다.
     * 
     * 🔹 Static 모드 (GitHub Pages 등):
     *    export const dynamic = 'force-static';
     *    → 빌드 에러를 방지합니다. (API는 무시되고 LikeButton이 localStorage 사용)
     */
    export const dynamic = 'force-dynamic';
    ```

### 🗑️ 제거된 항목
- `scripts/update-dynamic.js` 자동화 스크립트
- `prebuild` hook from `package.json`
- 테스트 및 분석 문서 파일들

### 📦 변경된 파일
- `src/app/api/likes/route.ts` - 수동 설정 가이드 주석 추가
- `src/app/components/LikeButton.tsx` - 로딩 상태 개선
- `package.json` - prebuild 스크립트 제거

### 🎯 사용 방법
1. **Dynamic 모드 개발/배포**: 
   - `route.ts`에서 `export const dynamic = 'force-dynamic';` 유지
   - `npm run dev` 또는 `npm run build`
   
2. **Static 모드 배포** (GitHub Pages):
   - `route.ts`에서 `export const dynamic = 'force-static';`로 수동 변경
   - `npm run build:static`
   - 배포 후 다시 `force-dynamic`으로 되돌리기 (선택사항)

