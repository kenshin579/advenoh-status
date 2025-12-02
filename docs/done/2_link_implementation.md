# 구현 문서 — 서비스 URL 클릭 링크 기능

## 수정 대상

- `src/components/ServiceCard.tsx`

## 구현 내용

### 변경 사항

`<p>` 태그를 `<a>` 태그로 변경하여 클릭 가능한 링크로 전환한다.

```tsx
// 변경 전 (line 22)
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

### 적용 속성

| 속성 | 값 | 목적 |
|------|---|------|
| `href` | `{service.url}` | 링크 대상 |
| `target` | `_blank` | 새 탭에서 열기 |
| `rel` | `noopener noreferrer` | 보안 (탭내빙 방지) |
| `onClick` | `stopPropagation()` | 이벤트 버블링 방지 |

### 스타일

- 기본: `text-blue-600` (파란색)
- 호버: `text-blue-800 hover:underline` (진한 파란색 + 밑줄)
