import { Hono } from "hono";
import { z } from "zod";
import { default as pino } from "pino";
import { default as chalk } from "chalk";
import { paginate, groupItems, sortItems, deduplicateBy, getAllTags } from "../../pkg-core/src/mod.ts";

const log = pino({ level: "info" });

// --- Schemas ---
const UserSchema = z.object({
  id: z.string(),
  username: z.string().min(3).max(30),
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]),
  tags: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

const CreateUserSchema = UserSchema.omit({ id: true });
type User = z.infer<typeof UserSchema>;

// --- Store ---
const users: User[] = [
  { id: "u1", username: "alice_dev", email: "alice@example.com", role: "admin", tags: ["typescript", "deno"], active: true },
  { id: "u2", username: "bob_eng", email: "bob@example.com", role: "editor", tags: ["javascript", "node"], active: true },
  { id: "u3", username: "carol_qa", email: "carol@example.com", role: "viewer", tags: ["testing", "deno"], active: false },
  { id: "u4", username: "dave_ops", email: "dave@example.com", role: "editor", tags: ["devops", "docker"], active: true },
  { id: "u5", username: "eve_ml", email: "eve@example.com", role: "viewer", tags: ["python", "ml"], active: true },
  { id: "u6", username: "frank_sec", email: "frank@example.com", role: "admin", tags: ["security", "deno"], active: true },
  { id: "u7", username: "grace_ux", email: "grace@example.com", role: "editor", tags: ["design", "css"], active: false },
  { id: "u8", username: "henry_db", email: "henry@example.com", role: "viewer", tags: ["database", "sql"], active: true },
];

let userCount = users.length;

// --- App ---
const app = new Hono();

app.get("/", (c) => {
  return c.json({
    app: "@myapp/pkg-api",
    version: "0.1.0",
    workspace: "deno-workspace",
    totalUsers: users.length,
  });
});

app.get("/users", (c) => {
  const page = parseInt(c.req.query("page") ?? "1");
  const pageSize = parseInt(c.req.query("pageSize") ?? "5");
  const role = c.req.query("role");
  const activeOnly = c.req.query("active") === "true";

  let filtered = [...users];
  if (role) filtered = filtered.filter((u) => u.role === role);
  if (activeOnly) filtered = filtered.filter((u) => u.active);

  const result = paginate(filtered, { page, pageSize });
  log.info({ page, pageSize, total: result.total }, "GET /users");
  return c.json(result);
});

app.get("/users/grouped", (c) => {
  const grouped = groupItems(users, (u) => u.role);
  return c.json({ grouped });
});

app.get("/users/tags", (c) => {
  const tags = getAllTags(users);
  return c.json({ tags, total: tags.length });
});

app.get("/users/:id", (c) => {
  const user = users.find((u) => u.id === c.req.param("id"));
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json(user);
});

app.post("/users", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON" }, 400);

  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 422);
  }

  const newUser: User = { id: `u${++userCount}`, ...parsed.data };
  users.push(newUser);
  log.info({ id: newUser.id, username: newUser.username }, "User created");
  return c.json(newUser, 201);
});

console.log(chalk.bold(chalk.blue("\n=== @myapp/pkg-api starting ===")));
console.log(chalk.green(`Loaded ${users.length} users`));
console.log(chalk.yellow(`All tags: ${getAllTags(users).join(", ")}`));

Deno.serve({ port: 8001 }, app.fetch);
