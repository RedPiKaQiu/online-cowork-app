import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "@/db/schema"

const globalForDatabase = globalThis as unknown as { pool?: Pool }

export const pool =
  globalForDatabase.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  })

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.pool = pool
}

export const db = drizzle({ client: pool, schema })
