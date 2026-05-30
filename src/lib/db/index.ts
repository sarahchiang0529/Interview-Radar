import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  conn: ReturnType<typeof postgres> | undefined;
  db: Db | undefined;
};

export function getDb(): Db {
  if (globalForDb.db) {
    return globalForDb.db;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const conn = globalForDb.conn ?? postgres(url, { prepare: false });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.conn = conn;
  }

  globalForDb.db = drizzle(conn, { schema });
  return globalForDb.db;
}

export { schema };
