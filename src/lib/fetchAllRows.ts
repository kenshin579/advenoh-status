/**
 * PostgREST 응답은 서버측 Max Rows(현재 1000)로 잘린다.
 * 범위 쿼리를 1000개씩 페이지네이션해 전체 행을 모은다.
 *
 * @param buildQuery 매 페이지마다 새 쿼리 빌더를 생성하는 팩토리.
 *   (빌더는 await 시 소비되므로 페이지마다 새로 만들어야 한다.)
 */
const PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
  buildQuery: () => {
    range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>;
  }
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}
