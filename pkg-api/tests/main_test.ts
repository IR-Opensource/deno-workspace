import { assertEquals, assertExists } from "@std/assert";
import { Hono } from "hono";
import { z } from "zod";
import { paginate, groupItems, getAllTags, deduplicateBy } from "../../pkg-core/src/mod.ts";

const UserSchema = z.object({
  id: z.string(),
  username: z.string().min(3),
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]),
  tags: z.array(z.string()),
  active: z.boolean(),
});

type User = z.infer<typeof UserSchema>;

const testUsers: User[] = [
  { id: "u1", username: "alice_dev", email: "alice@example.com", role: "admin", tags: ["deno", "ts"], active: true },
  { id: "u2", username: "bob_eng", email: "bob@example.com", role: "editor", tags: ["js", "node"], active: true },
  { id: "u3", username: "carol_qa", email: "carol@example.com", role: "viewer", tags: ["deno", "test"], active: false },
  { id: "u4", username: "dave_ops", email: "dave@example.com", role: "admin", tags: ["docker", "ci"], active: true },
  { id: "u5", username: "eve_ml", email: "eve@example.com", role: "editor", tags: ["python", "ml"], active: true },
];

// pkg-core integration tests
Deno.test("paginate works with workspace users", () => {
  const result = paginate(testUsers, { page: 1, pageSize: 3 });
  assertEquals(result.data.length, 3);
  assertEquals(result.total, 5);
  assertEquals(result.totalPages, 2);
});

Deno.test("paginate second page has remaining items", () => {
  const result = paginate(testUsers, { page: 2, pageSize: 3 });
  assertEquals(result.data.length, 2);
});

Deno.test("groupItems groups users by role", () => {
  const grouped = groupItems(testUsers, (u) => u.role);
  assertEquals(grouped["admin"].length, 2);
  assertEquals(grouped["editor"].length, 2);
  assertEquals(grouped["viewer"].length, 1);
});

Deno.test("getAllTags collects unique tags across users", () => {
  const tags = getAllTags(testUsers);
  assertEquals(tags.includes("deno"), true);
  assertEquals(tags.filter((t) => t === "deno").length, 1);
});

Deno.test("deduplicateBy removes users with duplicate emails", () => {
  const dupeUsers = [
    ...testUsers,
    { id: "u6", username: "alice2", email: "alice@example.com", role: "viewer" as const, tags: [], active: false },
  ];
  const deduped = deduplicateBy(dupeUsers, (u) => u.email);
  assertEquals(deduped.length, 5);
});

// Hono API tests
Deno.test("Hono GET / returns app info", async () => {
  const app = new Hono();
  app.get("/", (c) => c.json({ app: "@myapp/pkg-api", version: "0.1.0" }));
  const res = await app.request("/");
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.version, "0.1.0");
});

Deno.test("Hono returns 404 for unknown routes", async () => {
  const app = new Hono();
  app.get("/", (c) => c.json({ ok: true }));
  const res = await app.request("/unknown");
  assertEquals(res.status, 404);
});

// Zod validation tests
Deno.test("zod validates correct user", () => {
  const result = UserSchema.safeParse(testUsers[0]);
  assertEquals(result.success, true);
});

Deno.test("zod rejects short username", () => {
  const result = UserSchema.safeParse({ ...testUsers[0], username: "ab" });
  assertEquals(result.success, false);
});

Deno.test("zod rejects invalid role", () => {
  const result = UserSchema.safeParse({ ...testUsers[0], role: "superadmin" });
  assertEquals(result.success, false);
});
