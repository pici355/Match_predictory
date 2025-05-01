import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * This script alters the existing tables to match our new schema
 */
async function runMigration() {
  try {
    console.log("Running database migration...");
    
    // 1. Modify users table: remove email, change password to pin
    console.log("Modifying users table...");
    await db.execute(sql`
      ALTER TABLE IF EXISTS users 
      DROP COLUMN IF EXISTS email,
      DROP COLUMN IF EXISTS password,
      ADD COLUMN IF NOT EXISTS pin TEXT NOT NULL DEFAULT '1234';
    `);
    
    // 2. Modify predictions table: add credits column, remove name column
    console.log("Modifying predictions table...");
    await db.execute(sql`
      ALTER TABLE IF EXISTS predictions
      DROP COLUMN IF EXISTS name,
      ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 2;
    `);
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
runMigration().then(() => process.exit(0));