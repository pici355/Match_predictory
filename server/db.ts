import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import session from "express-session";
import connectPgSimple from 'connect-pg-simple';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Set up PostgreSQL session store
const PostgresStore = connectPgSimple(session);
export const PgStore = new PostgresStore({
  pool,
  tableName: 'session',
  createTableIfMissing: true,
});