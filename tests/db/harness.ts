import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";

/**
 * A real Postgres (PGlite, in memory) with every migration applied and just enough of Supabase around it:
 * an auth.users table, auth.uid() driven by a session setting, the anon/authenticated/service_role roles with
 * Supabase's default grants, and the realtime publication. Queries run through `as(...)` switch to the
 * `authenticated` (or `anon`) role, so row-level security is enforced exactly as it is in production.
 */
export async function createTestDatabase() {
  const db = new PGlite({ extensions: { vector } });
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('test.role', true), ''), 'authenticated') $$;
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create publication supabase_realtime;
    create schema extensions;
  `);

  const directory = join(process.cwd(), "supabase", "migrations");
  for (const file of readdirSync(directory).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(directory, file), "utf8"));
  }

  // Supabase's defaults: API roles can use the schemas and tables; RLS decides which rows.
  await db.exec(`
    grant usage on schema public, auth, extensions to anon, authenticated, service_role;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
    grant usage, select on all sequences in schema public to anon, authenticated, service_role;
  `);

  /** Runs `work` as a signed-in user (or anonymously with userId null), then returns to the superuser. */
  async function as<T>(userId: string | null, work: () => Promise<T>): Promise<T> {
    await db.exec(`select set_config('test.uid', '${userId ?? ""}', false); set role ${userId ? "authenticated" : "anon"};`);
    try {
      return await work();
    } finally {
      await db.exec(`reset role; select set_config('test.uid', '', false);`);
    }
  }

  async function createUser(id: string, email: string) {
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, email]);
    return id;
  }

  /** Creates an organization the way the app does: through create_organization as that user. */
  async function createOrganization(ownerId: string, name: string) {
    return as(ownerId, async () => (await db.query<{ id: string }>(`select id from public.create_organization($1)`, [name])).rows[0].id);
  }

  return { db, as, createUser, createOrganization };
}

export const ids = {
  ownerA: "a0000000-0000-4000-8000-000000000001",
  ownerB: "b0000000-0000-4000-8000-000000000001",
  agentA: "a0000000-0000-4000-8000-000000000002",
};
