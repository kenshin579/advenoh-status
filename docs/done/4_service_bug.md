# 서비스 버그 분석 및 수정

## 1. 헤더 중복 문제

### 증상
- Admin 페이지(`/admin`)에 접근하면 헤더가 2개 중복으로 표시됨

### 원인 분석
헤더가 두 곳에서 렌더링되고 있었음:

1. **루트 레이아웃 경로**: `src/app/layout.tsx` → `AppLayout` → `Header`
2. **Admin 레이아웃 경로**: `src/app/admin/layout.tsx` → `Header`

Next.js App Router에서 레이아웃은 중첩되므로, Admin 페이지 접근 시 헤더가 2번 렌더링됨

### 수정 내용
`src/app/admin/layout.tsx`에서 `Header` 컴포넌트 제거

```tsx
// 수정 전
import Header from '@/components/Header';

return (
  <div className="min-h-screen bg-gray-50">
    <Header />  {/* 중복 */}
    <div className="flex">
      <AdminSidebar />
      <main>{children}</main>
    </div>
  </div>
);

// 수정 후
return (
  <div className="flex">
    <AdminSidebar />
    <main className="flex-1 p-6 bg-gray-50 min-h-[calc(100vh-4rem)]">
      {children}
    </main>
  </div>
);
```

---

## 2. 로그인 후 아바타 아이콘 및 드롭다운 메뉴

### 요구사항
- 로그인 시 헤더에 원 모양의 아바타 아이콘 표시 (이메일 첫 글자)
- 아이콘 클릭 시 드롭다운 메뉴 표시
- 드롭다운 메뉴에 Admin, Logout 포함

### 수정 내용
`src/components/Header.tsx` 수정

1. **상태 및 ref 추가**
```tsx
const [isDropdownOpen, setIsDropdownOpen] = useState(false);
const dropdownRef = useRef<HTMLDivElement>(null);
```

2. **외부 클릭 시 드롭다운 닫기**
```tsx
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsDropdownOpen(false);
    }
  }
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
```

3. **네비게이션에서 Admin 링크 제거** (드롭다운으로 이동)
```tsx
const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/history', label: 'History' },
  // Admin 제거 - 드롭다운 메뉴로 이동
];
```

4. **아바타 아이콘 + 드롭다운 메뉴 UI**
```tsx
{showUserInfo && (
  <div className="relative" ref={dropdownRef}>
    {/* 아바타 아이콘 */}
    <button
      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium text-sm"
    >
      {dbUser?.email?.charAt(0).toUpperCase() || 'A'}
    </button>

    {/* 드롭다운 메뉴 */}
    {isDropdownOpen && (
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
        <div className="px-4 py-2 text-sm text-gray-500 border-b truncate">
          {dbUser?.email}
        </div>
        <Link href="/admin">Admin</Link>
        <button onClick={signOut}>Logout</button>
      </div>
    )}
  </div>
)}
```

---

## 수정된 파일

| 파일 | 수정 내용 |
|-----|----------|
| `src/app/admin/layout.tsx` | Header 컴포넌트 제거 |
| `src/components/Header.tsx` | 아바타 아이콘 + 드롭다운 메뉴 추가 |
