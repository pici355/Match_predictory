import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * This script alters the existing tables to match our new schema
 */
async function runMigration() {
  try {
    console.log("Running database migration...");
    
    // 1. Modify matches table: add result and hasResult columns
    console.log("Modifying matches table...");
    await db.execute(sql`
      ALTER TABLE IF EXISTS matches 
      ADD COLUMN IF NOT EXISTS result TEXT,
      ADD COLUMN IF NOT EXISTS has_result BOOLEAN NOT NULL DEFAULT false;
    `);
    
    // 2. Modify predictions table: add isCorrect column
    console.log("Modifying predictions table...");
    await db.execute(sql`
      ALTER TABLE IF EXISTS predictions
      ADD COLUMN IF NOT EXISTS is_correct BOOLEAN NOT NULL DEFAULT false;
    `);
    
    // 3. Create prize_distributions table
    console.log("Creating prize_distributions table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS prize_distributions (
        id SERIAL PRIMARY KEY,
        match_day INTEGER NOT NULL,
        total_pot INTEGER NOT NULL,
        pot_for_4_correct INTEGER NOT NULL,
        pot_for_5_correct INTEGER NOT NULL,
        users_4_correct INTEGER NOT NULL DEFAULT 0,
        users_5_correct INTEGER NOT NULL DEFAULT 0,
        is_distributed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // 4. Create winner_payouts table
    console.log("Creating winner_payouts table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS winner_payouts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        match_day INTEGER NOT NULL,
        correct_predictions INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // 5. Create teams table
    console.log("Creating teams table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        logo TEXT,
        manager_name TEXT NOT NULL,
        credits INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
runMigration().then(() => process.exit(0));