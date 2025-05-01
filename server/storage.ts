import { 
  type Prediction, 
  type InsertPrediction, 
  type Match,
  type InsertMatch,
  type User,
  type InsertUser,
  type MatchResult,
  type PrizeDistribution,
  type InsertPrizeDistribution,
  type WinnerPayout,
  type InsertWinnerPayout,
  type Team,
  type InsertTeam,
  predictions,
  matches,
  users,
  prizeDistributions,
  winnerPayouts,
  teams
} from "@shared/schema";
import { db } from "./db";
import { eq, and, lte, gte, sql, inArray, count } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  verifyUserPin(username: string, pin: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Match operations
  getAllMatches(): Promise<Match[]>;
  getMatchesByMatchDay(matchDay: number): Promise<Match[]>;
  getMatch(id: number): Promise<Match | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatchResult(matchId: number, result: string): Promise<Match | undefined>;
  
  // Team operations
  getAllTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  getTeamByName(name: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeamCredits(id: number, credits: number): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  
  // Prediction operations
  getAllPredictions(): Promise<Prediction[]>;
  getPredictionsByMatchId(matchId: number): Promise<Prediction[]>;
  getPredictionsByUserId(userId: number): Promise<Prediction[]>;
  getPredictionsByMatchDay(matchDay: number): Promise<Prediction[]>;
  getUserPredictionsByMatchDay(userId: number, matchDay: number): Promise<Prediction[]>;
  getPrediction(id: number): Promise<Prediction | undefined>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  updatePrediction(id: number, prediction: Partial<InsertPrediction>): Promise<Prediction | undefined>;
  isPredictionEditable(predictionId: number): Promise<boolean>;
  
  // Prize operations
  calculatePrizeDistribution(matchDay: number): Promise<PrizeDistribution>;
  distributePrizes(matchDay: number): Promise<WinnerPayout[]>;
  getPrizeDistribution(matchDay: number): Promise<PrizeDistribution | undefined>;
  getWinnerPayouts(matchDay: number): Promise<WinnerPayout[]>;
  getUserPayouts(userId: number): Promise<WinnerPayout[]>;
  
  // Statistics
  getTotalCreditsForMatchDay(matchDay: number): Promise<number>;
  getCorrectPredictionCountForUser(userId: number, matchDay: number): Promise<number>;
  getUsersWithCorrectPredictionCount(matchDay: number, correctCount: number): Promise<User[]>;
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
  
  async verifyUserPin(username: string, pin: string): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(and(
        eq(users.username, username),
        eq(users.pin, pin)
      ));
    return user;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
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
  
  async updateMatchResult(matchId: number, result: string): Promise<Match | undefined> {
    // Update the match with the result
    const [updatedMatch] = await db.update(matches)
      .set({ result, hasResult: true })
      .where(eq(matches.id, matchId))
      .returning();
    
    if (!updatedMatch) return undefined;
    
    // Update all predictions for this match to set isCorrect flag
    await db.update(predictions)
      .set({ isCorrect: eq(predictions.prediction, result) })
      .where(eq(predictions.matchId, matchId));
    
    return updatedMatch;
  }
  
  // Team operations
  async getAllTeams(): Promise<Team[]> {
    return await db.select().from(teams);
  }
  
  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }
  
  async getTeamByName(name: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.name, name));
    return team;
  }
  
  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }
  
  async updateTeamCredits(id: number, credits: number): Promise<Team | undefined> {
    const [updatedTeam] = await db.update(teams)
      .set({ credits })
      .where(eq(teams.id, id))
      .returning();
    return updatedTeam;
  }
  
  async deleteTeam(id: number): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id));
    return !!result;
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
  
  async getPredictionsByMatchDay(matchDay: number): Promise<Prediction[]> {
    // Get all matches for this match day
    const matchesForDay = await this.getMatchesByMatchDay(matchDay);
    const matchIds = matchesForDay.map(m => m.id);
    
    if (matchIds.length === 0) return [];
    
    // Get all predictions for these matches
    return await db.select()
      .from(predictions)
      .where(inArray(predictions.matchId, matchIds));
  }
  
  async getUserPredictionsByMatchDay(userId: number, matchDay: number): Promise<Prediction[]> {
    // Get all matches for this match day
    const matchesForDay = await this.getMatchesByMatchDay(matchDay);
    const matchIds = matchesForDay.map(m => m.id);
    
    if (matchIds.length === 0) return [];
    
    // Get all user predictions for these matches
    return await db.select()
      .from(predictions)
      .where(and(
        eq(predictions.userId, userId),
        inArray(predictions.matchId, matchIds)
      ));
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
  
  // Prize operations
  async calculatePrizeDistribution(matchDay: number): Promise<PrizeDistribution> {
    // Get the total pot for this match day
    const totalCredits = await this.getTotalCreditsForMatchDay(matchDay);
    
    // Calculate the allocation for 4 and 5 correct predictions (35% and 65%)
    const potFor4Correct = Math.floor(totalCredits * 0.35);
    const potFor5Correct = totalCredits - potFor4Correct; // Ensure we use the full pot
    
    // Count users with 4 and 5 correct predictions
    const users4Correct = (await this.getUsersWithCorrectPredictionCount(matchDay, 4)).length;
    const users5Correct = (await this.getUsersWithCorrectPredictionCount(matchDay, 5)).length;
    
    // Create or update prize distribution record
    const [existingDistribution] = await db.select()
      .from(prizeDistributions)
      .where(eq(prizeDistributions.matchDay, matchDay));
    
    if (existingDistribution) {
      // Update existing distribution
      const [updated] = await db.update(prizeDistributions)
        .set({
          totalPot: totalCredits,
          potFor4Correct,
          potFor5Correct,
          users4Correct,
          users5Correct,
        })
        .where(eq(prizeDistributions.matchDay, matchDay))
        .returning();
      
      return updated;
    } else {
      // Create new distribution
      const [newDistribution] = await db.insert(prizeDistributions)
        .values({
          matchDay,
          totalPot: totalCredits,
          potFor4Correct,
          potFor5Correct,
          users4Correct,
          users5Correct,
        })
        .returning();
      
      return newDistribution;
    }
  }
  
  async distributePrizes(matchDay: number): Promise<WinnerPayout[]> {
    // Get the prize distribution
    const distribution = await this.getPrizeDistribution(matchDay);
    if (!distribution) {
      throw new Error(`No prize distribution found for match day ${matchDay}`);
    }
    
    if (distribution.isDistributed) {
      // Prizes already distributed
      return this.getWinnerPayouts(matchDay);
    }
    
    const payouts: InsertWinnerPayout[] = [];
    
    // Process winners with 4 correct predictions
    const users4Correct = distribution.users4Correct || 0;
    if (users4Correct > 0) {
      const winners4 = await this.getUsersWithCorrectPredictionCount(matchDay, 4);
      const potFor4Correct = distribution.potFor4Correct || 0;
      const amountPer4 = Math.floor(potFor4Correct / users4Correct);
      
      winners4.forEach(user => {
        payouts.push({
          userId: user.id,
          matchDay,
          correctPredictions: 4,
          amount: amountPer4,
        });
      });
    }
    
    // Process winners with 5 correct predictions
    const users5Correct = distribution.users5Correct || 0;
    if (users5Correct > 0) {
      const winners5 = await this.getUsersWithCorrectPredictionCount(matchDay, 5);
      const potFor5Correct = distribution.potFor5Correct || 0;
      const amountPer5 = Math.floor(potFor5Correct / users5Correct);
      
      winners5.forEach(user => {
        payouts.push({
          userId: user.id,
          matchDay,
          correctPredictions: 5,
          amount: amountPer5,
        });
      });
    }
    
    // Insert all payouts in a transaction
    const savedPayouts = await db.transaction(async (tx) => {
      // Insert all winner payouts
      const savedPayouts = await Promise.all(
        payouts.map(async (payout) => {
          const [saved] = await tx.insert(winnerPayouts)
            .values(payout)
            .returning();
          return saved;
        })
      );
      
      // Mark distribution as complete
      await tx.update(prizeDistributions)
        .set({ isDistributed: true })
        .where(eq(prizeDistributions.matchDay, matchDay));
      
      return savedPayouts;
    });
    
    return savedPayouts;
  }
  
  async getPrizeDistribution(matchDay: number): Promise<PrizeDistribution | undefined> {
    const [distribution] = await db.select()
      .from(prizeDistributions)
      .where(eq(prizeDistributions.matchDay, matchDay));
    
    return distribution;
  }
  
  async getWinnerPayouts(matchDay: number): Promise<WinnerPayout[]> {
    return await db.select()
      .from(winnerPayouts)
      .where(eq(winnerPayouts.matchDay, matchDay));
  }
  
  async getUserPayouts(userId: number): Promise<WinnerPayout[]> {
    return await db.select()
      .from(winnerPayouts)
      .where(eq(winnerPayouts.userId, userId));
  }
  
  // Statistics
  async getTotalCreditsForMatchDay(matchDay: number): Promise<number> {
    // Get all matches for this match day
    const matchesForDay = await this.getMatchesByMatchDay(matchDay);
    const matchIds = matchesForDay.map(m => m.id);
    
    if (matchIds.length === 0) return 0;
    
    // Sum all credits for predictions on these matches
    const result = await db.select({
      totalCredits: sql<number>`SUM(${predictions.credits})`
    })
    .from(predictions)
    .where(inArray(predictions.matchId, matchIds));
    
    return result[0]?.totalCredits || 0;
  }
  
  async getCorrectPredictionCountForUser(userId: number, matchDay: number): Promise<number> {
    // Get all matches for this match day
    const matchesForDay = await this.getMatchesByMatchDay(matchDay);
    
    // Filter only matches that have results
    const matchesWithResults = matchesForDay.filter(m => m.hasResult);
    const matchIds = matchesWithResults.map(m => m.id);
    
    if (matchIds.length === 0) return 0;
    
    // Count correct predictions
    const result = await db.select({
      correctCount: count()
    })
    .from(predictions)
    .where(
      and(
        eq(predictions.userId, userId),
        inArray(predictions.matchId, matchIds),
        eq(predictions.isCorrect, true)
      )
    );
    
    return result[0]?.correctCount || 0;
  }
  
  async getUsersWithCorrectPredictionCount(matchDay: number, correctCount: number): Promise<User[]> {
    // This is more complex as we need to find users who have exactly 'correctCount' correct predictions
    
    // Step 1: Get all users
    const allUsers = await this.getAllUsers();
    
    // Step 2: Filter to users who have exactly 'correctCount' correct predictions for this match day
    const usersWithCorrectCount: User[] = [];
    
    // Check each user's correct prediction count
    for (const user of allUsers) {
      const userCorrectCount = await this.getCorrectPredictionCountForUser(user.id, matchDay);
      if (userCorrectCount === correctCount) {
        usersWithCorrectCount.push(user);
      }
    }
    
    return usersWithCorrectCount;
  }
}

export const storage = new DatabaseStorage();
