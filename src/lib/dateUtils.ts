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
