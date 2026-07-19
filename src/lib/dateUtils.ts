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
 * Date(instant)를 서비스 표준 타임존 Asia/Seoul(UTC+9 고정, DST 없음)의
 * YYYY-MM-DD 날짜 키로 변환한다.
 * 저장 파이프라인(health_check.py)이 KST 날짜로 버킷팅하므로 조회/렌더도 동일 기준을 쓴다.
 * 호출부 호환을 위해 함수명은 유지한다.
 */
export const toLocalDateString = (date: Date): string => {
  const kstMs = date.getTime() + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(0, 10);
};

import type { DailyStatusSummary } from '@/types';

export const calcUptime30d = (
  summaryByDate: Map<string, DailyStatusSummary[]>,
  serviceId: string,
  days = 30
): number | null => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let ok = 0;
  let tracked = 0;

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const summaries = summaryByDate.get(toLocalDateString(d));
    const summary = summaries?.find((s) => s.service_id === serviceId);
    if (!summary) continue;
    tracked += 1;
    if (summary.status === 'OK') ok += 1;
  }

  if (tracked === 0) return null;
  return Math.round((ok / tracked) * 10000) / 100;
};

/**
 * MonthlyCalendar가 표시하는 `months`개월(현재 월 포함) 구간의
 * 가장 이른 날(= months-1개월 전 1일)부터 오늘까지의 일수를 반환한다.
 * useUptimeData(days)에 넘겨 불필요한 과다 조회를 막는다.
 */
export const daysToCoverMonths = (months: number): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const earliest = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
  const diffMs = today.getTime() - earliest.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 2; // +2일 여유
};
