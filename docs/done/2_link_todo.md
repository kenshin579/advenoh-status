# TODO — 서비스 URL 클릭 링크 기능

## 1단계: 구현

- [x] `src/components/ServiceCard.tsx` 수정
  - [x] `<p>` 태그를 `<a>` 태그로 변경
  - [x] `href={service.url}` 추가
  - [x] `target="_blank"` 추가
  - [x] `rel="noopener noreferrer"` 추가
  - [x] 링크 스타일 적용 (`text-blue-600 hover:text-blue-800 hover:underline`)
  - [x] `onClick={(e) => e.stopPropagation()}` 추가

## 2단계: 테스트 (MCP Playwright 사용)

- [x] 개발 서버 실행 (`npm run dev`)
- [x] 메인 페이지 접속
- [x] URL 링크 hover 시 스타일 변경 확인
- [x] URL 클릭 시 새 탭에서 해당 페이지 열림 확인
- [x] 카드 다른 영역 클릭 시 이벤트 충돌 없음 확인

## 3단계: 빌드 검증

- [x] `npm run build` 성공 확인
- [x] `npm run lint` 오류 없음 확인
