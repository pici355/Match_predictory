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
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
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
  updateTeam(id: number, team: InsertTeam): Promise<Team | undefined>;
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
  getCorrectPredictionStatsForUser(userId: number, matchDay: number): Promise<{
    correctCount: number,
    totalCount: number,
    percentage: number
  }>;
  getUsersWithCorrectPredictionPercentage(matchDay: number, percentage: number): Promise<{
    user: User,
    correctCount: number,
    totalCount: number,
    percentage: number
  }[]>;
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
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      // Delete all predictions made by this user
      await db.delete(predictions).where(eq(predictions.userId, id));
      
      // Delete the user
      const result = await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
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
  
  async updateMatch(id: number, matchData: Partial<InsertMatch>): Promise<Match | undefined> {
    const [updatedMatch] = await db.update(matches)
      .set(matchData)
      .where(eq(matches.id, id))
      .returning();
    return updatedMatch;
  }
  
  async deleteMatch(id: number): Promise<boolean> {
    try {
      // First delete all predictions associated with this match
      await db.delete(predictions).where(eq(predictions.matchId, id));
      
      // Then delete the match
      await db.delete(matches).where(eq(matches.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting match:", error);
      return false;
    }
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
  
  async updateTeam(id: number, team: InsertTeam): Promise<Team | undefined> {
    const [updatedTeam] = await db.update(teams)
      .set(team)
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
    
    // Check if match starts in more than 30 minutes (using UTC times for server consistency)
    const now = new Date();
    const matchStartTime = new Date(match.matchDate);
    const thirtyMinutesBeforeMatch = new Date(matchStartTime.getTime() - 30 * 60 * 1000);
    
    console.log(`Server check - Match time: ${matchStartTime.toISOString()}, Current time: ${now.toISOString()}, Editable until: ${thirtyMinutesBeforeMatch.toISOString()}`);
    
    return now < thirtyMinutesBeforeMatch;
  }
  
  // Prize operations
  async calculatePrizeDistribution(matchDay: number): Promise<PrizeDistribution> {
    // Get the total submissions for this match day
    const totalCredits = await this.getTotalCreditsForMatchDay(matchDay);
    
    // Nel nuovo sistema, i premi sono fissi e non vengono calcolati come percentuali del montepremi
    // Manteniamo comunque la struttura della tabella, ma con informazioni aggiornate
    // 100% previsioni corrette: 10 crediti per utente
    // 90% previsioni corrette: 8 crediti per utente
    // 80% previsioni corrette: 6 crediti per utente
    
    // Count users with 80%, 90% and 100% correct predictions
    const users80PctResults = await this.getUsersWithCorrectPredictionPercentage(matchDay, 80);
    const users90PctResults = await this.getUsersWithCorrectPredictionPercentage(matchDay, 90);
    const users100PctResults = await this.getUsersWithCorrectPredictionPercentage(matchDay, 100);
    
    const users80PctCorrect = users80PctResults.length;
    const users90PctCorrect = users90PctResults.length;
    const users100PctCorrect = users100PctResults.length;
    
    // Calcolo del totale dei crediti distribuiti
    const potFor100Pct = users100PctCorrect * 10; // 10 crediti per ogni utente al 100%
    const potFor90Pct = users90PctCorrect * 8;    // 8 crediti per ogni utente al 90%
    const potFor80Pct = users80PctCorrect * 6;    // 6 crediti per ogni utente all'80%
    
    // Create or update prize distribution record
    const [existingDistribution] = await db.select()
      .from(prizeDistributions)
      .where(eq(prizeDistributions.matchDay, matchDay));
    
    if (existingDistribution) {
      // Update existing distribution
      const [updated] = await db.update(prizeDistributions)
        .set({
          totalPot: totalCredits,
          potFor80Pct: potFor80Pct,
          potFor90Pct: potFor90Pct,
          potFor100Pct: potFor100Pct,
          users80PctCorrect: users80PctCorrect,
          users90PctCorrect: users90PctCorrect,
          users100PctCorrect: users100PctCorrect,
        })
        .where(eq(prizeDistributions.matchDay, matchDay))
        .returning();
      
      return updated;
    } else {
      // Create new distribution
      const [newDistribution] = await db.insert(prizeDistributions)
        .values([{
          matchDay: matchDay,
          totalPot: totalCredits,
          potFor80Pct: potFor80Pct,
          potFor90Pct: potFor90Pct,
          potFor100Pct: potFor100Pct,
          users80PctCorrect: users80PctCorrect,
          users90PctCorrect: users90PctCorrect,
          users100PctCorrect: users100PctCorrect,
        }])
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
    
    // Sistema di premi fissi:
    // - 100% previsioni corrette: 10 crediti
    // - 90% previsioni corrette: 8 crediti
    // - 80% previsioni corrette: 6 crediti
    
    // Processo vincitori con 100% previsioni corrette - premio di 10 crediti
    const winners100Pct = await this.getUsersWithCorrectPredictionPercentage(matchDay, 100);
    winners100Pct.forEach(result => {
      payouts.push({
        userId: result.user.id,
        matchDay: matchDay,
        correctPercentage: result.percentage,
        predictionsCorrect: result.correctCount,
        predictionsTotal: result.totalCount,
        amount: 10, // Premio fisso: 10 crediti
      });
    });
    
    // Processo vincitori con 90% previsioni corrette - premio di 8 crediti
    const winners90Pct = await this.getUsersWithCorrectPredictionPercentage(matchDay, 90);
    winners90Pct.forEach(result => {
      payouts.push({
        userId: result.user.id,
        matchDay: matchDay,
        correctPercentage: result.percentage,
        predictionsCorrect: result.correctCount,
        predictionsTotal: result.totalCount,
        amount: 8, // Premio fisso: 8 crediti
      });
    });
    
    // Processo vincitori con 80% previsioni corrette - premio di 6 crediti
    const winners80Pct = await this.getUsersWithCorrectPredictionPercentage(matchDay, 80);
    winners80Pct.forEach(result => {
      // Escludiamo gli utenti che hanno già vinto premi più alti (90% e 100%)
      const alreadyRewarded = winners100Pct.some(w => w.user.id === result.user.id) || 
                             winners90Pct.some(w => w.user.id === result.user.id);
      
      if (!alreadyRewarded) {
        payouts.push({
          userId: result.user.id,
          matchDay: matchDay,
          correctPercentage: result.percentage,
          predictionsCorrect: result.correctCount,
          predictionsTotal: result.totalCount,
          amount: 6, // Premio fisso: 6 crediti
        });
      }
    });
    
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
  
  async getCorrectPredictionStatsForUser(userId: number, matchDay: number): Promise<{
    correctCount: number,
    totalCount: number,
    percentage: number
  }> {
    // Get all user predictions for this match day
    const userPredictions = await this.getUserPredictionsByMatchDay(userId, matchDay);
    
    // Filter only predictions for matches that have results
    const predictionsForMatchesWithResults = await Promise.all(
      userPredictions.map(async prediction => {
        const match = await this.getMatch(prediction.matchId);
        return match?.hasResult ? prediction : null;
      })
    );
    
    // Filter out null values and count
    const validPredictions = predictionsForMatchesWithResults.filter(p => p !== null) as Prediction[];
    const totalCount = validPredictions.length;
    
    if (totalCount === 0) {
      return { correctCount: 0, totalCount: 0, percentage: 0 };
    }
    
    // Count correct predictions
    const correctCount = validPredictions.filter(p => p.isCorrect).length;
    
    // Calculate percentage (rounded to nearest whole number)
    const percentage = Math.round((correctCount / totalCount) * 100);
    
    return { correctCount, totalCount, percentage };
  }
  
  async getUsersWithCorrectPredictionPercentage(matchDay: number, targetPercentage: number): Promise<{
    user: User,
    correctCount: number,
    totalCount: number,
    percentage: number
  }[]> {
    // Get all users who have made predictions for this match day
    const allUsers = await this.getAllUsers();
    const usersWithPredictions = await Promise.all(
      allUsers.map(async user => {
        const predictions = await this.getUserPredictionsByMatchDay(user.id, matchDay);
        return predictions.length > 0 ? user : null;
      })
    );
    
    const validUsers = usersWithPredictions.filter(u => u !== null) as User[];
    
    // Calculate stats for each user and filter by target percentage
    const results = await Promise.all(
      validUsers.map(async user => {
        const stats = await this.getCorrectPredictionStatsForUser(user.id, matchDay);
        return {
          user,
          ...stats
        };
      })
    );
    
    // Return users who match the target percentage
    return results.filter(result => {
      // Only include users who have made at least one prediction
      if (result.totalCount === 0) return false;
      
      // For 100% requirement, the percentage must be exactly 100
      if (targetPercentage === 100) {
        return result.percentage === 100;
      }
      
      // For 90% requirement, the percentage must be >= 90 and < 100
      if (targetPercentage === 90) {
        return result.percentage >= 90 && result.percentage < 100;
      }
      
      // For 80% requirement, the percentage must be >= 80 and < 90
      if (targetPercentage === 80) {
        return result.percentage >= 80 && result.percentage < 90;
      }
      
      return false;
    });
  }
}

export const storage = new DatabaseStorage();
