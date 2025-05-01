import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // This will be the fantacalcio team name
  pin: text("pin").notNull(), // PIN for login instead of password
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Matches table
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  matchDate: timestamp("match_date").notNull(),
  matchDay: integer("match_day").notNull(),
  description: text("description"),
  result: text("result"), // "1", "X", or "2" - null if not available yet
  hasResult: boolean("has_result").default(false).notNull(), // Flag to indicate if the match has a result
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const matchesRelations = relations(matches, ({ many }) => ({
  predictions: many(predictions),
}));

// Create a base schema
const baseMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
  result: true,
  hasResult: true,
});

// Override with custom matchDate handling
export const matchSchema = baseMatchSchema.extend({
  matchDate: z.union([
    z.string().transform((str) => new Date(str)),
    z.date()
  ]),
});

// Schema for updating match results
export const matchResultSchema = z.object({
  id: z.number(),
  result: z.enum(["1", "X", "2"]),
});

// Predictions table
export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Required - must be associated with a user
  matchId: integer("match_id").notNull(),
  prediction: text("prediction").notNull(), // "1", "X", or "2"
  credits: integer("credits").notNull(), // Credits used for this prediction (2-8)
  isCorrect: boolean("is_correct").default(false), // Whether the prediction was correct
  isEditable: boolean("is_editable").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const predictionsRelations = relations(predictions, ({ one }) => ({
  match: one(matches, {
    fields: [predictions.matchId],
    references: [matches.id],
  }),
  user: one(users, {
    fields: [predictions.userId],
    references: [users.id],
  }),
}));

// Create the prediction schema directly rather than using createInsertSchema 
// since we've modified fields
export const predictSchema = z.object({
  userId: z.number(),
  matchId: z.number(),
  prediction: z.string(), // "1", "X", or "2"
  credits: z.number().min(2).max(8), // Credits between 2-8
});

// Prize distribution table to keep track of payouts
export const prizeDistributions = pgTable("prize_distributions", {
  id: serial("id").primaryKey(),
  matchDay: integer("match_day").notNull(),
  totalPot: integer("total_pot").notNull(), // Total credits in the pot
  potFor4Correct: integer("pot_for_4_correct").notNull(), // 35% of total pot
  potFor5Correct: integer("pot_for_5_correct").notNull(), // 65% of total pot
  users4Correct: integer("users_4_correct").default(0), // Number of users with 4 correct predictions
  users5Correct: integer("users_5_correct").default(0), // Number of users with 5 correct predictions
  isDistributed: boolean("is_distributed").default(false), // Whether prizes have been distributed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema for prize calculations
export const prizeDistributionSchema = createInsertSchema(prizeDistributions).omit({
  id: true,
  createdAt: true,
});

// Winner payouts table to track individual winnings
export const winnerPayouts = pgTable("winner_payouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  matchDay: integer("match_day").notNull(),
  correctPredictions: integer("correct_predictions").notNull(), // Either 4 or 5
  amount: integer("amount").notNull(), // Amount of credits won
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const winnerPayoutSchema = createInsertSchema(winnerPayouts).omit({
  id: true,
  createdAt: true,
});

// Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  logo: text("logo"), // Path to logo image
  managerName: text("manager_name").notNull(), // Team manager's name
  credits: integer("credits").default(0), // Current credit count
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof userSchema>;

export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof matchSchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;

export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = z.infer<typeof predictSchema>;

export type PrizeDistribution = typeof prizeDistributions.$inferSelect;
export type InsertPrizeDistribution = z.infer<typeof prizeDistributionSchema>;

export type WinnerPayout = typeof winnerPayouts.$inferSelect;
export type InsertWinnerPayout = z.infer<typeof winnerPayoutSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof teamSchema>;
