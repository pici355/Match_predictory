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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const matchesRelations = relations(matches, ({ many }) => ({
  predictions: many(predictions),
}));

// Create a base schema
const baseMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
});

// Override with custom matchDate handling
export const matchSchema = baseMatchSchema.extend({
  matchDate: z.union([
    z.string().transform((str) => new Date(str)),
    z.date()
  ]),
});

// Predictions table
export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Required - must be associated with a user
  matchId: integer("match_id").notNull(),
  prediction: text("prediction").notNull(), // "1", "X", or "2"
  credits: integer("credits").notNull(), // Credits used for this prediction (2-8)
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof userSchema>;

export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof matchSchema>;

export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = z.infer<typeof predictSchema>;
