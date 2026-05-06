import { chunk, distinct, sortBy } from "@std/collections";
import { encodeBase64 } from "@std/encoding/base64";

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function paginate<T>(items: T[], opts: PaginationOptions): PaginatedResult<T> {
  const { page, pageSize } = opts;
  const start = (page - 1) * pageSize;
  const data = items.slice(start, start + pageSize);
  return {
    data,
    page,
    pageSize,
    total: items.length,
    totalPages: Math.ceil(items.length / pageSize),
  };
}

export function groupItems<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

export function sortItems<T, K extends string | number | bigint | Date>(
  items: T[],
  keyFn: (item: T) => K,
): T[] {
  return sortBy(items, keyFn);
}

export function deduplicateBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => R[],
): R[] {
  const batches = chunk(items, batchSize);
  return batches.flatMap(processor);
}

export function hashContent(content: string): string {
  return encodeBase64(new TextEncoder().encode(content));
}

export function getAllTags(items: { tags: string[] }[]): string[] {
  return distinct(items.flatMap((i) => i.tags));
}
