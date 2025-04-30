import { 
  type Prediction, 
  type InsertPrediction, 
  type Match,
  type InsertMatch,
  type User,
  type InsertUser,
  predictions,
  matches,
  users
} from "@shared/schema";
import { db } from "./db";
import { eq, and, lte, gte } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Match operations
  getAllMatches(): Promise<Match[]>;
  getMatchesByMatchDay(matchDay: number): Promise<Match[]>;
  getMatch(id: number): Promise<Match | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  
  // Prediction operations
  getAllPredictions(): Promise<Prediction[]>;
  getPredictionsByMatchId(matchId: number): Promise<Prediction[]>;
  getPredictionsByUserId(userId: number): Promise<Prediction[]>;
  getPrediction(id: number): Promise<Prediction | undefined>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  updatePrediction(id: number, prediction: Partial<InsertPrediction>): Promise<Prediction | undefined>;
  isPredictionEditable(predictionId: number): Promise<boolean>;
}

// Database implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  
  // Match operations
  async getAllMatches(): Promise<Match[]> {
    return await db.select().from(matches);
  }
  
  async getMatchesByMatchDay(matchDay: number): Promise<Match[]> {
    return await db.select().from(matches).where(eq(matches.matchDay, matchDay));
  }
  
  async getMatch(id: number): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }
  
  async createMatch(match: InsertMatch): Promise<Match> {
    const [newMatch] = await db.insert(matches).values(match).returning();
    return newMatch;
  }
  
  // Prediction operations
  async getAllPredictions(): Promise<Prediction[]> {
    return await db.select().from(predictions);
  }
  
  async getPredictionsByMatchId(matchId: number): Promise<Prediction[]> {
    return await db.select().from(predictions).where(eq(predictions.matchId, matchId));
  }
  
  async getPredictionsByUserId(userId: number): Promise<Prediction[]> {
    return await db.select().from(predictions).where(eq(predictions.userId, userId));
  }
  
  async getPrediction(id: number): Promise<Prediction | undefined> {
    const [prediction] = await db.select().from(predictions).where(eq(predictions.id, id));
    return prediction;
  }
  
  async createPrediction(prediction: InsertPrediction): Promise<Prediction> {
    const now = new Date();
    const [newPrediction] = await db.insert(predictions)
      .values({
        ...prediction,
        isEditable: true,
        updatedAt: now
      })
      .returning();
    return newPrediction;
  }
  
  async updatePrediction(id: number, prediction: Partial<InsertPrediction>): Promise<Prediction | undefined> {
    const now = new Date();
    const [updatedPrediction] = await db.update(predictions)
      .set({
        ...prediction,
        updatedAt: now
      })
      .where(eq(predictions.id, id))
      .returning();
    return updatedPrediction;
  }
  
  async isPredictionEditable(predictionId: number): Promise<boolean> {
    const [prediction] = await db.select().from(predictions).where(eq(predictions.id, predictionId));
    if (!prediction) return false;
    
    const [match] = await db.select().from(matches).where(eq(matches.id, prediction.matchId));
    if (!match) return false;
    
    // Check if match starts in more than 30 minutes
    const now = new Date();
    const matchStartTime = new Date(match.matchDate);
    const thirtyMinutesBeforeMatch = new Date(matchStartTime);
    thirtyMinutesBeforeMatch.setMinutes(matchStartTime.getMinutes() - 30);
    
    return now < thirtyMinutesBeforeMatch;
  }
}

export const storage = new DatabaseStorage();
