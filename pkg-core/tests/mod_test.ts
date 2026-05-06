import { assertEquals, assertExists } from "@std/assert";
import {
  paginate,
  groupItems,
  sortItems,
  deduplicateBy,
  batchProcess,
  hashContent,
  getAllTags,
} from "../src/mod.ts";

const sampleItems = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Item ${i + 1}`,
  category: i % 3 === 0 ? "alpha" : i % 3 === 1 ? "beta" : "gamma",
  price: (i + 1) * 5.0,
  tags: [`tag-${i % 4}`, `cat-${i % 3}`],
}));

Deno.test("paginate returns correct page", () => {
  const result = paginate(sampleItems, { page: 1, pageSize: 10 });
  assertEquals(result.data.length, 10);
  assertEquals(result.total, 25);
  assertEquals(result.totalPages, 3);
  assertEquals(result.page, 1);
});

Deno.test("paginate handles last page correctly", () => {
  const result = paginate(sampleItems, { page: 3, pageSize: 10 });
  assertEquals(result.data.length, 5);
  assertEquals(result.page, 3);
});

Deno.test("groupItems groups by category", () => {
  const grouped = groupItems(sampleItems, (i) => i.category);
  assertExists(grouped["alpha"]);
  assertExists(grouped["beta"]);
  assertExists(grouped["gamma"]);
});

Deno.test("sortItems sorts by price ascending", () => {
  const shuffled = [...sampleItems].sort(() => Math.random() - 0.5);
  const sorted = sortItems(shuffled, (i) => i.price);
  assertEquals(sorted[0].price, 5.0);
  assertEquals(sorted[sorted.length - 1].price, 125.0);
});

Deno.test("deduplicateBy removes duplicates by key", () => {
  const dupes = [
    { id: 1, name: "A", key: "x" },
    { id: 2, name: "B", key: "y" },
    { id: 3, name: "C", key: "x" },
  ];
  const result = deduplicateBy(dupes, (i) => i.key);
  assertEquals(result.length, 2);
  assertEquals(result[0].name, "A");
});

Deno.test("batchProcess processes items in batches", () => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const result = batchProcess(numbers, 3, (batch) => batch.map((n) => n * 2));
  assertEquals(result, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
});

Deno.test("hashContent returns base64 string", () => {
  const hash = hashContent("hello world");
  assertExists(hash);
  assertEquals(typeof hash, "string");
  assertEquals(hash.length > 0, true);
});

Deno.test("getAllTags collects and deduplicates all tags", () => {
  const items = [
    { tags: ["deno", "web", "typescript"] },
    { tags: ["deno", "api", "rest"] },
    { tags: ["typescript", "testing"] },
  ];
  const tags = getAllTags(items);
  assertEquals(tags.includes("deno"), true);
  assertEquals(tags.includes("typescript"), true);
  // deno and typescript should appear only once
  assertEquals(tags.filter((t) => t === "deno").length, 1);
});
