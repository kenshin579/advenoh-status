/**
 * PostgreSQL timestamp 문자열을 Date 객체로 변환
 * '2025-12-28 06:07:09.312465+00' → Date 객체
 *
 * PostgreSQL 형식과 ISO 8601 형식의 차이를 처리:
 * - 공백 → T
 * - +00 → +00:00
 */
export const parseTimestamp = (timestamp: string): Date => {
  const isoString = timestamp
    .replace(' ', 'T')
    .replace(/([+-]\d{2})$/, '$1:00');
  return new Date(isoString);
};

/**
 * Date 객체를 로컬 타임존 기준 YYYY-MM-DD 문자열로 변환
 * toISOString()은 UTC로 변환되므로 사용하지 않음
 */
export const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
