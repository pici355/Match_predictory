import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  prediction: text("prediction").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const predictSchema = createInsertSchema(predictions).pick({
  name: true,
  prediction: true,
});

export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = z.infer<typeof predictSchema>;
