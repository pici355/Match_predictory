import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * This script modifies the prize distribution tables to use percentage-based scoring
 */
async function runPrizeMigration() {
  try {
    console.log("Running prize distribution migration...");
    
    // 1. Check if prize_distributions table exists
    const prizeTableResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'prize_distributions'
      );
    `);
    
    const prizeTableExists = prizeTableResult.rows[0] as { exists: boolean };
    console.log("Prize distributions table exists:", prizeTableExists.exists);
    
    if (prizeTableExists.exists) {
      // 2. Create new columns
      console.log("Altering prize_distributions table...");
      await db.execute(sql`
        ALTER TABLE prize_distributions
        ADD COLUMN IF NOT EXISTS pot_for_90_pct INTEGER,
        ADD COLUMN IF NOT EXISTS pot_for_100_pct INTEGER,
        ADD COLUMN IF NOT EXISTS users_90_pct_correct INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS users_100_pct_correct INTEGER DEFAULT 0;
      `);
      
      // 3. Migrate existing data
      console.log("Migrating existing prize distribution data...");
      await db.execute(sql`
        UPDATE prize_distributions
        SET 
          pot_for_90_pct = pot_for_4_correct,
          pot_for_100_pct = pot_for_5_correct,
          users_90_pct_correct = users_4_correct,
          users_100_pct_correct = users_5_correct
        WHERE 
          pot_for_90_pct IS NULL OR
          pot_for_100_pct IS NULL;
      `);
    }
    
    // 4. Check if winner_payouts table exists
    const payoutsTableResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'winner_payouts'
      );
    `);
    
    const payoutsTableExists = payoutsTableResult.rows[0] as { exists: boolean };
    console.log("Winner payouts table exists:", payoutsTableExists.exists);
    
    if (payoutsTableExists.exists) {
      // 5. Update winner_payouts table
      console.log("Altering winner_payouts table...");
      await db.execute(sql`
        ALTER TABLE winner_payouts
        ADD COLUMN IF NOT EXISTS correct_percentage INTEGER,
        ADD COLUMN IF NOT EXISTS predictions_correct INTEGER,
        ADD COLUMN IF NOT EXISTS predictions_total INTEGER;
      `);
      
      // 6. Migrate existing data
      console.log("Migrating existing winner payout data...");
      await db.execute(sql`
        UPDATE winner_payouts
        SET 
          correct_percentage = CASE
            WHEN correct_predictions = 5 THEN 100
            WHEN correct_predictions = 4 THEN 80
            ELSE 0
          END,
          predictions_correct = correct_predictions,
          predictions_total = 5
        WHERE 
          correct_percentage IS NULL OR
          predictions_correct IS NULL OR
          predictions_total IS NULL;
      `);
    }

    console.log("Prize distribution migration completed successfully!");
  } catch (error) {
    console.error("Prize distribution migration failed:", error);
    process.exit(1);
  }
}

// No need for direct execution check in ES modules
export { runPrizeMigration };