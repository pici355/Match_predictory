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
  getLeaderboard(type: 'current' | 'overall'): Promise<{
    matchDay: number,
    lastUpdated: string,
    users: {
      id: number,
      username: string,
      correctPredictions: number,
      totalPredictions: number,
      successRate: number, 
      creditsWon: number,
      position: number,
      previousPosition?: number
    }[]
  }>;
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
      
      // Delete any winner payouts associated with this user
      await db.delete(winnerPayouts).where(eq(winnerPayouts.userId, id));
      
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
    
    // Nel nuovo sistema, solo chi ottiene il 100% delle previsioni corrette riceve premi
    // Solo 100% previsioni corrette: 10 crediti per utente
    
    // Count users with 100% correct predictions
    const users100PctResults = await this.getUsersWithCorrectPredictionPercentage(matchDay, 100);
    const users100PctCorrect = users100PctResults.length;
    
    // Calcolo del totale dei crediti distribuiti
    const potFor100Pct = users100PctCorrect * 10; // 10 crediti per ogni utente al 100%
    
    // Create or update prize distribution record
    const [existingDistribution] = await db.select()
      .from(prizeDistributions)
      .where(eq(prizeDistributions.matchDay, matchDay));
    
    if (existingDistribution) {
      // Update existing distribution
      const [updated] = await db.update(prizeDistributions)
        .set({
          totalPot: totalCredits,
          potFor100Pct: potFor100Pct,
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
          potFor100Pct: potFor100Pct,
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
    
    // Sistema semplificato:
    // - Solo chi ha 100% previsioni corrette: 10 crediti
    
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
    // Get matches for this match day
    const matchesForDay = await this.getMatchesByMatchDay(matchDay);
    
    if (matchesForDay.length === 0) {
      console.log(`Nessuna partita trovata per la giornata ${matchDay}`);
      return { correctCount: 0, totalCount: 0, percentage: 0 };
    }
    
    // Filtra solo le partite con risultati
    const matchesWithResult = matchesForDay.filter(m => m.hasResult === true);
    
    if (matchesWithResult.length === 0) {
      console.log(`Nessuna partita con risultato per la giornata ${matchDay}`);
      return { correctCount: 0, totalCount: 0, percentage: 0 };
    }
    
    const matchIds = matchesWithResult.map(m => m.id);
    
    console.log(`Calcolo statistiche per utente ${userId}, giornata ${matchDay}: trovate ${matchesWithResult.length} partite con risultati (IDs: ${matchIds.join(', ')})`);
    
    // Get predictions for these matches for this user
    const userPredictions = await db.select()
      .from(predictions)
      .where(and(
        eq(predictions.userId, userId),
        inArray(predictions.matchId, matchIds)
      ));
    
    if (userPredictions.length === 0) {
      console.log(`Nessuna previsione trovata per l'utente ${userId} nella giornata ${matchDay}`);
      return { correctCount: 0, totalCount: 0, percentage: 0 };
    }
    
    console.log(`Previsioni trovate per l'utente ${userId}: ${userPredictions.length}`);
    userPredictions.forEach(p => {
      console.log(`  - Previsione ID ${p.id}, Partita ID ${p.matchId}, Predizione ${p.prediction}, isCorrect: ${p.isCorrect}`);
    });
    
    // Conta i pronostici corretti
    const totalCount = userPredictions.length;
    const correctCount = userPredictions.filter(p => p.isCorrect === true).length;
    
    // Calculate percentage
    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    
    console.log(`Statistiche utente ${userId}: ${correctCount}/${totalCount} corretti (${percentage}%)`);
    
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
  
  async getLeaderboard(type: 'current' | 'overall'): Promise<{
    matchDay: number,
    lastUpdated: string,
    users: {
      id: number,
      username: string,
      correctPredictions: number,
      totalPredictions: number,
      successRate: number, 
      creditsWon: number,
      position: number,
      previousPosition?: number
    }[]
  }> {
    // Get all users
    const allUsers = await this.getAllUsers();
    
    // Get current match day (use the highest match day with matches)
    const allMatches = await this.getAllMatches();
    const matchDays = allMatches.map(m => m.matchDay).sort((a, b) => b - a);
    const currentMatchDay = matchDays.length > 0 ? matchDays[0] : 1;
    
    // Per la giornata corrente, se è la prima o non ci sono ancora partite con risultati,
    // usa la giornata precedente per mostrare i risultati
    const previousMatchDay = currentMatchDay > 1 ? currentMatchDay - 1 : 1;
    
    // Controlla se ci sono risultati nella giornata corrente
    const currentMatchesWithResults = allMatches
      .filter(m => m.matchDay === currentMatchDay && m.hasResult === true)
      .length;
    
    // Se non ci sono risultati nella giornata corrente, usa la giornata precedente
    const effectiveMatchDay = currentMatchesWithResults > 0 ? currentMatchDay : previousMatchDay;
    
    console.log(`Generazione classifica - giornata corrente: ${currentMatchDay}, 
                 giornata effettiva per la classifica: ${effectiveMatchDay},
                 partite con risultati nella giornata corrente: ${currentMatchesWithResults}`);
    
    let leaderboardUsers = [];
    
    if (type === 'current') {
      // Get stats for current match day only (o per la giornata precedente se non ci sono risultati)
      const userStats = await Promise.all(
        allUsers.map(async user => {
          const stats = await this.getCorrectPredictionStatsForUser(user.id, effectiveMatchDay);
          
          // Un punto per ogni pronostico vincente
          const leaderboardPoints = stats.correctCount;
          
          return {
            id: user.id,
            username: user.username,
            correctPredictions: stats.correctCount,
            totalPredictions: stats.totalCount,
            successRate: stats.percentage,
            creditsWon: leaderboardPoints, // Ora i "crediti vinti" sono i punti della classifica
            // Position will be calculated after sorting
            position: 0,
            // No previous position for current match day view
          };
        })
      );
      
      // Only include users who have made predictions
      leaderboardUsers = userStats.filter(user => user.totalPredictions > 0);
      
      console.log(`Classifica giornata - Utenti trovati: ${leaderboardUsers.length}`);
    } else {
      // Get overall stats across all match days with COMPLETED matches
      const userStats = await Promise.all(
        allUsers.map(async user => {
          // Get all user predictions
          const userPredictions = await this.getPredictionsByUserId(user.id);
          
          // Filter predictions for matches with results
          const predictionsWithResults = await Promise.all(
            userPredictions.map(async prediction => {
              const match = await this.getMatch(prediction.matchId);
              return match?.hasResult ? prediction : null;
            })
          );
          
          const validPredictions = predictionsWithResults.filter(p => p !== null) as Prediction[];
          const totalCount = validPredictions.length;
          
          if (totalCount === 0) {
            return {
              id: user.id,
              username: user.username,
              correctPredictions: 0,
              totalPredictions: 0,
              successRate: 0,
              creditsWon: 0,
              position: 0,
            };
          }
          
          // Count correct predictions
          const correctCount = validPredictions.filter(p => p.isCorrect).length;
          
          // Calculate percentage
          const percentage = Math.round((correctCount / totalCount) * 100);
          
          // Un punto per ogni pronostico vincente (in totale)
          const leaderboardPoints = correctCount;
          
          return {
            id: user.id,
            username: user.username,
            correctPredictions: correctCount,
            totalPredictions: totalCount,
            successRate: percentage,
            creditsWon: leaderboardPoints, // Ora i "crediti vinti" sono i punti della classifica
            // Position will be calculated after sorting
            position: 0,
            // No previous position for overall view
          };
        })
      );
      
      // Only include users who have made predictions
      leaderboardUsers = userStats.filter(user => user.totalPredictions > 0);
      
      console.log(`Classifica generale - Utenti trovati: ${leaderboardUsers.length}`);
    }
    
    // Sort users primarily by punti (correctPredictions) e secondariamente per percentuale
    leaderboardUsers.sort((a, b) => {
      // Prima ordinamento per punti (ossia correctPredictions o creditsWon)
      if (b.creditsWon !== a.creditsWon) {
        return b.creditsWon - a.creditsWon;
      }
      // Secondario per tasso di successo
      if (b.successRate !== a.successRate) {
        return b.successRate - a.successRate;
      }
      // Se entrambi hanno gli stessi punti e percentuale, ordina per numero di predizioni
      return b.totalPredictions - a.totalPredictions;
    });
    
    // Assign positions
    leaderboardUsers.forEach((user, index) => {
      user.position = index + 1;
    });
    
    return {
      matchDay: effectiveMatchDay, // Aggiornato per mostrare la giornata corretta
      lastUpdated: new Date().toISOString(),
      users: leaderboardUsers
    };
  }
}

export const storage = new DatabaseStorage();
