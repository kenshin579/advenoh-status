# 📄 PRD — 서비스 URL 클릭 링크 기능

## 1. 개요

서비스 카드에 표시되는 URL을 클릭하면 해당 서비스 페이지로 새 탭에서 이동하는 기능을 추가한다.

---

## 2. 현재 상태

- `ServiceCard` 컴포넌트에서 URL이 텍스트로만 표시됨
- 클릭해도 아무 동작 없음

```tsx
// 현재 코드 (src/components/ServiceCard.tsx:22)
<p className="text-sm text-gray-500 mt-1">{service.url}</p>
```

---

## 3. 요구사항

### 3.1 기능 요구사항

| 항목 | 설명 |
|------|------|
| 클릭 동작 | URL 클릭 시 해당 페이지로 이동 |
| 새 탭 열기 | `target="_blank"` 적용 |
| 보안 | `rel="noopener noreferrer"` 적용 |
| 시각적 피드백 | 링크 스타일 적용 (호버 시 밑줄, 색상 변경 등) |

### 3.2 UI/UX 요구사항

- 링크임을 인지할 수 있는 시각적 표시 (파란색 텍스트 또는 호버 효과)
- 호버 시 커서가 포인터로 변경
- 기존 카드 클릭 영역과 충돌하지 않도록 이벤트 버블링 방지

---

## 4. 구현 방안

### 4.1 수정 대상 파일

- `src/components/ServiceCard.tsx`

### 4.2 변경 내용

```tsx
// 변경 전
<p className="text-sm text-gray-500 mt-1">{service.url}</p>

// 변경 후
<a
  href={service.url}
  target="_blank"
  rel="noopener noreferrer"
  className="text-sm text-blue-600 hover:text-blue-800 hover:underline mt-1 inline-block"
  onClick={(e) => e.stopPropagation()}
>
  {service.url}
</a>
```

### 4.3 스타일 옵션

| 옵션 | 설명 |
|------|------|
| A. 파란색 링크 | `text-blue-600 hover:text-blue-800` |
| B. 회색 + 호버 밑줄 | `text-gray-500 hover:underline` |
| C. 아이콘 추가 | 외부 링크 아이콘 (↗) 추가 |

---

## 5. 관련 문서

- 구현: `2_link_implementation.md`
- TODO: `2_link_todo.md`
