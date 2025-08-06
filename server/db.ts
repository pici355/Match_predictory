import { Pool } from "pg";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@shared/schema";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // necessario se il DB richiede SSL
  },
});

export const db = drizzle(pool, { schema });

// Setup session store PostgreSQL
const PostgresStore = connectPgSimple(session);
export const PgStore = new PostgresStore({
  pool,
  tableName: "session",
  createTableIfMissing: true,
});
