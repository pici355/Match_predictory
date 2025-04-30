import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  password: text("password").notNull(),
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

export const matchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
});

// Predictions table
export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  matchId: integer("match_id").notNull(),
  prediction: text("prediction").notNull(), // "1", "X", or "2"
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

export const predictSchema = createInsertSchema(predictions)
  .pick({
    name: true,
    matchId: true,
    prediction: true,
  })
  .extend({
    userId: z.number().optional(),
  });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof userSchema>;

export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof matchSchema>;

export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = z.infer<typeof predictSchema>;
