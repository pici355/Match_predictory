import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import { storage } from "./storage";
import { predictSchema, matchSchema, userSchema, teamSchema } from "@shared/schema";
import { z } from "zod";
import { sendPredictionNotification, sendExcelImportReport } from "./email";
import path from "path";

// Extend Express session type
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Set up multer for team logo uploads
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'attached_assets/team-logos');
  },
  filename: function (req, file, cb) {
    // Genera il nome del file basato sul nome della squadra
    const teamName = req.body.teamName || 'team';
    const sanitizedName = teamName.toLowerCase().replace(/\s+/g, '-');
    
    // Ottieni l'estensione originale
    const ext = file.originalname.split('.').pop();
    cb(null, `${sanitizedName}.${ext}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accetta solo immagini
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Middleware to check if the user is an admin
const isAdmin = async (req: Request, res: Response, next: Function) => {
  const userId = req.session?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  try {
    const user = await storage.getUser(userId);
    
    if (!user) {
      console.log("Admin middleware: User not found");
      return res.status(403).json({ message: "Access denied" });
    }
    
    console.log("Admin middleware checking user:", user);
    
    // Use the correct property name (isAdmin) from the User model
    if (!user.isAdmin) {
      console.log("Admin middleware: User is not admin");
      return res.status(403).json({ message: "Access denied" });
    }
    
    next();
  } catch (error) {
    console.error("Error in admin check middleware:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files for team logos
  app.use('/team-logos', (req, res, next) => {
    const options = {
      root: path.join(process.cwd(), 'attached_assets/team-logos'),
      dotfiles: 'deny' as const, // Type annotation to fix TypeScript error
      headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
      }
    };
    
    // rimuovi il primo slash dal path
    const fileName = req.path.replace(/^\//, '');
    res.sendFile(fileName, options, (err) => {
      if (err) {
        console.error(`Error serving team logo: ${fileName}`, err);
        next(err);
      }
    });
  });
  // Get current user
  app.get("/api/me", async (req, res) => {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log("Raw user data from database:", user);
      
      res.json({
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Authentication routes
  app.post("/api/register", async (req, res) => {
    try {
      // Custom validation for registration using PIN
      const registrationSchema = z.object({
        username: z.string().min(3, { message: "Il nome della squadra deve avere almeno 3 caratteri" }),
        pin: z.string().length(4, { message: "Il PIN deve essere di 4 cifre" })
          .regex(/^\d+$/, { message: "Il PIN deve contenere solo numeri" }),
      });
      
      const validatedData = registrationSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Il nome squadra è già in uso" });
      }
      
      // Create the user with validated data
      const user = await storage.createUser(validatedData);
      
      // Store user ID in session
      req.session.userId = user.id;
      
      res.status(201).json({ 
        id: user.id, 
        username: user.username,
        isAdmin: user.isAdmin
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });
  
  app.post("/api/login", async (req, res) => {
    try {
      const loginSchema = z.object({
        username: z.string(),
        pin: z.string(),
      });
      
      const { username, pin } = loginSchema.parse(req.body);
      
      // Use the PIN verification method
      const user = await storage.verifyUserPin(username, pin);
      
      if (!user) {
        return res.status(401).json({ message: "Nome squadra o PIN non validi" });
      }
      
      // Store user ID in session
      req.session.userId = user.id;
      
      res.json({ 
        id: user.id, 
        username: user.username,
        isAdmin: user.isAdmin
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });
  
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      
      res.json({ message: "Logged out successfully" });
    });
  });

  // Match routes
  app.get("/api/matches", async (_req, res) => {
    try {
      const matches = await storage.getAllMatches();
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });
  
  app.get("/api/matches/matchday/:matchDay", async (req, res) => {
    try {
      const matchDay = parseInt(req.params.matchDay);
      if (isNaN(matchDay)) {
        return res.status(400).json({ message: "Invalid match day" });
      }
      
      const matches = await storage.getMatchesByMatchDay(matchDay);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });
  
  app.get("/api/matches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid match ID" });
      }
      
      const match = await storage.getMatch(id);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      res.json(match);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch match" });
    }
  });
  
  app.post("/api/matches", isAdmin, async (req, res) => {
    try {
      console.log("Received match data:", req.body);
      
      try {
        const validatedData = matchSchema.parse(req.body);
        console.log("Validated match data:", validatedData);
        
        const match = await storage.createMatch(validatedData);
        res.status(201).json(match);
      } catch (validationError) {
        console.error("Match validation error:", validationError);
        if (validationError instanceof Error) {
          return res.status(400).json({ message: validationError.message });
        }
        return res.status(400).json({ message: "Invalid match data" });
      }
    } catch (error) {
      console.error("Match creation error:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });
  
  // Update an existing match
  app.patch("/api/matches/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid match ID" });
      }
      
      // Get the match to update
      const match = await storage.getMatch(id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Check if predictions exist for this match
      const predictions = await storage.getPredictionsByMatchId(id);
      if (predictions.length > 0) {
        // If there are predictions, only allow updating the description
        const { description } = req.body;
        const updatedMatch = await storage.updateMatch(id, { description });
        
        return res.json({
          ...updatedMatch,
          notice: "Only description was updated as predictions already exist for this match"
        });
      }
      
      // No predictions exist, full update is allowed
      const validatedData = matchSchema.partial().parse(req.body);
      const updatedMatch = await storage.updateMatch(id, validatedData);
      
      if (!updatedMatch) {
        return res.status(500).json({ message: "Failed to update match" });
      }
      
      res.json(updatedMatch);
    } catch (error) {
      console.error("Match update error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid match data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update match" });
    }
  });
  
  // Delete a match
  app.delete("/api/matches/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid match ID" });
      }
      
      // Check if the match exists
      const match = await storage.getMatch(id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Delete the match and its predictions
      const success = await storage.deleteMatch(id);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete match" });
      }
      
      res.json({ success: true, message: "Match and all associated predictions deleted" });
    } catch (error) {
      console.error("Match deletion error:", error);
      res.status(500).json({ message: "Failed to delete match" });
    }
  });
  
  // Upload Excel file with matches
  app.post("/api/matches/upload", isAdmin, upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    try {
      const workbook = XLSX.read(req.file.buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);
      
      if (!data || data.length === 0) {
        await sendExcelImportReport(false, "Excel file has no data");
        return res.status(400).json({ message: "Excel file has no data" });
      }
      
      const requiredFields = ["homeTeam", "awayTeam", "matchDate", "matchDay"];
      const firstRow = data[0] as any;
      
      for (const field of requiredFields) {
        if (!(field in firstRow)) {
          const message = `Excel file is missing required field: ${field}`;
          await sendExcelImportReport(false, message);
          return res.status(400).json({ message });
        }
      }
      
      const createdMatches = [];
      
      for (const row of data) {
        const rowData = row as any;
        
        const match = await storage.createMatch({
          homeTeam: rowData.homeTeam,
          awayTeam: rowData.awayTeam,
          matchDate: new Date(rowData.matchDate),
          matchDay: rowData.matchDay,
          description: rowData.description || null,
        });
        
        createdMatches.push(match);
      }
      
      const message = `Successfully imported ${createdMatches.length} matches`;
      await sendExcelImportReport(true, message);
      res.json({ message, matches: createdMatches });
    } catch (error) {
      console.error("Excel import error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await sendExcelImportReport(false, `Failed to process Excel file: ${errorMessage}`);
      res.status(500).json({ message: "Failed to process Excel file" });
    }
  });

  // Prediction routes
  app.get("/api/predictions", async (_req, res) => {
    try {
      const predictions = await storage.getAllPredictions();
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch predictions" });
    }
  });
  
  app.get("/api/predictions/match/:matchId", async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      if (isNaN(matchId)) {
        return res.status(400).json({ message: "Invalid match ID" });
      }
      
      const predictions = await storage.getPredictionsByMatchId(matchId);
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch predictions" });
    }
  });
  
  app.get("/api/predictions/matchday/:matchDay", async (req, res) => {
    try {
      const matchDay = parseInt(req.params.matchDay);
      if (isNaN(matchDay)) {
        return res.status(400).json({ message: "Invalid match day" });
      }
      
      const predictions = await storage.getPredictionsByMatchDay(matchDay);
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch predictions" });
    }
  });
  
  app.get("/api/predictions/user", async (req, res) => {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      // Get user predictions
      const predictions = await storage.getPredictionsByUserId(userId);
      
      // Enrich with match data
      if (predictions.length > 0) {
        const enrichedPredictions = await Promise.all(
          predictions.map(async (prediction) => {
            const match = await storage.getMatch(prediction.matchId);
            return {
              ...prediction,
              match
            };
          })
        );
        res.json(enrichedPredictions);
      } else {
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch predictions" });
    }
  });
  
  app.get("/api/predictions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid prediction ID" });
      }
      
      const prediction = await storage.getPrediction(id);
      
      if (!prediction) {
        return res.status(404).json({ message: "Prediction not found" });
      }
      
      res.json(prediction);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch prediction" });
    }
  });
  
  // Team management routes (Admin only)
  app.get("/api/teams", async (_req, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });
  
  app.post("/api/teams", isAdmin, async (req, res) => {
    try {
      const data = teamSchema.parse(req.body);
      const team = await storage.createTeam(data);
      res.status(201).json(team);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid team data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create team" });
    }
  });
  
  app.patch("/api/teams/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }
      
      const data = teamSchema.parse(req.body);
      const updatedTeam = await storage.updateTeam(id, data);
      
      if (!updatedTeam) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.json(updatedTeam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid team data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update team" });
    }
  });
  
  app.delete("/api/teams/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }
      
      const deleted = await storage.deleteTeam(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete team" });
    }
  });
  
  app.get("/api/teams/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }
      
      const team = await storage.getTeam(id);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.json(team);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });
  
  // User management routes (Admin only)
  app.get("/api/users", isAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  app.post("/api/users", isAdmin, async (req, res) => {
    try {
      // Admin creates a user with pin
      const userSchema = z.object({
        username: z.string().min(3, { message: "Il nome della squadra deve avere almeno 3 caratteri" }),
        pin: z.string().length(4, { message: "Il PIN deve essere di 4 cifre" })
          .regex(/^\d+$/, { message: "Il PIN deve contenere solo numeri" }),
        isAdmin: z.boolean().optional(),
      });
      
      const validatedData = userSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Il nome squadra è già in uso" });
      }
      
      const newUser = await storage.createUser(validatedData);
      res.status(201).json(newUser);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });
  
  // Update user (Admin only)
  app.patch("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // User update schema allows PIN to be optional for updates
      const updateUserSchema = z.object({
        username: z.string().min(3, { message: "Il nome della squadra deve avere almeno 3 caratteri" }),
        pin: z.string().length(4, { message: "Il PIN deve essere di 4 cifre" })
          .regex(/^\d+$/, { message: "Il PIN deve contenere solo numeri" })
          .optional(),
        isAdmin: z.boolean().optional(),
      });
      
      const validatedData = updateUserSchema.parse(req.body);
      
      // If updating username, check if the new username already exists (but not for the same user)
      if (validatedData.username) {
        const existingUser = await storage.getUserByUsername(validatedData.username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Il nome squadra è già in uso" });
        }
      }
      
      const updatedUser = await storage.updateUser(userId, validatedData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });
  
  // Delete user (Admin only)
  app.delete("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow deleting the current user
      if (req.session.userId === userId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }
      
      // Delete user
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete user" });
      }
      
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  
  // Match results
  app.post("/api/matches/:matchId/result", isAdmin, async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      if (isNaN(matchId)) {
        return res.status(400).json({ message: "Invalid match ID" });
      }
      
      const resultSchema = z.object({
        result: z.enum(["1", "X", "2"]),
      });
      
      const { result } = resultSchema.parse(req.body);
      
      const updatedMatch = await storage.updateMatchResult(matchId, result);
      
      if (!updatedMatch) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      res.json(updatedMatch);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });
  
  // Prize distribution routes
  app.get("/api/prizes/matchday/:matchDay", async (req, res) => {
    try {
      const matchDay = parseInt(req.params.matchDay);
      if (isNaN(matchDay)) {
        return res.status(400).json({ message: "Invalid match day" });
      }
      
      const distribution = await storage.getPrizeDistribution(matchDay);
      
      if (!distribution) {
        // If no distribution exists yet, calculate it on the fly
        const calculatedDistribution = await storage.calculatePrizeDistribution(matchDay);
        return res.json(calculatedDistribution);
      }
      
      res.json(distribution);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch prize distribution" });
    }
  });
  
  app.post("/api/prizes/matchday/:matchDay/calculate", isAdmin, async (req, res) => {
    try {
      const matchDay = parseInt(req.params.matchDay);
      if (isNaN(matchDay)) {
        return res.status(400).json({ message: "Invalid match day" });
      }
      
      const distribution = await storage.calculatePrizeDistribution(matchDay);
      res.json(distribution);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });
  
  app.post("/api/prizes/matchday/:matchDay/distribute", isAdmin, async (req, res) => {
    try {
      const matchDay = parseInt(req.params.matchDay);
      if (isNaN(matchDay)) {
        return res.status(400).json({ message: "Invalid match day" });
      }
      
      const payouts = await storage.distributePrizes(matchDay);
      res.json(payouts);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });
  
  app.get("/api/prizes/user", async (req, res) => {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const payouts = await storage.getUserPayouts(userId);
      res.json(payouts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user payouts" });
    }
  });
  
  // Statistics routes
  app.get("/api/statistics/matchday/:matchDay/total-credits", async (req, res) => {
    try {
      const matchDay = parseInt(req.params.matchDay);
      if (isNaN(matchDay)) {
        return res.status(400).json({ message: "Invalid match day" });
      }
      
      const totalCredits = await storage.getTotalCreditsForMatchDay(matchDay);
      res.json({ matchDay, totalCredits });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });
  
  app.get("/api/statistics/user/:userId/correct-predictions/:matchDay", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const matchDay = parseInt(req.params.matchDay);
      
      if (isNaN(userId) || isNaN(matchDay)) {
        return res.status(400).json({ message: "Invalid user ID or match day" });
      }
      
      const stats = await storage.getCorrectPredictionStatsForUser(userId, matchDay);
      res.json({ userId, matchDay, ...stats });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // POST a new prediction
  app.post("/api/predictions", async (req, res) => {
    try {
      const validatedData = predictSchema.parse(req.body);
      
      // If user is logged in, attach user ID
      if (req.session?.userId) {
        validatedData.userId = req.session.userId;
      }
      
      // Get the match to check which match day it belongs to
      const match = await storage.getMatch(validatedData.matchId);
      if (!match) {
        return res.status(404).json({ message: "Partita non trovata" });
      }
      
      // Get user ID
      const userId = validatedData.userId;
      
      // Get all user predictions for this match day using our optimized method
      const existingPredictions = await storage.getUserPredictionsByMatchDay(userId, match.matchDay);
      
      // Check if this user already has a prediction for this match
      const existingPrediction = existingPredictions.find(p => p.matchId === validatedData.matchId);
      
      // If the user already has a prediction for this match, update it instead of creating a new one
      if (existingPrediction) {
        // Check if the prediction is still editable (30 mins before match start)
        const isEditable = await storage.isPredictionEditable(existingPrediction.id);
        
        if (!isEditable) {
          return res.status(400).json({ message: "Il pronostico non è più modificabile (meno di 30 minuti all'inizio della partita)" });
        }
        
        // Update the existing prediction
        const updatedPrediction = await storage.updatePrediction(existingPrediction.id, {
          prediction: validatedData.prediction,
          credits: validatedData.credits
        });
        
        return res.json(updatedPrediction);
      }
      
      // Get all match days to determine if the user is trying to predict a future match day
      const currentMatchDay = match.matchDay;
      
      // Get all distinct match days
      const allMatches = await storage.getAllMatches();
      const matchDays = allMatches.map(m => m.matchDay);
      // Filter out duplicates manually instead of using Set
      const uniqueMatchDays: number[] = [];
      matchDays.forEach(day => {
        if (!uniqueMatchDays.includes(day)) {
          uniqueMatchDays.push(day);
        }
      });
      const minMatchDay = Math.min(...uniqueMatchDays);
      
      // Require at least 5 predictions for the minimum match day first
      if (currentMatchDay > minMatchDay) {
        const predictionsForMinDay = await storage.getUserPredictionsByMatchDay(userId, minMatchDay);
        if (predictionsForMinDay.length < 5) {
          return res.status(400).json({
            message: `Devi prima fare minimo 5 pronostici per la giornata ${minMatchDay} prima di poter pronosticare le giornate successive.`
          });
        }
      }
      
      const savedPrediction = await storage.createPrediction(validatedData);
      
      // Send email notification
      await sendPredictionNotification(savedPrediction);
      
      res.status(201).json(savedPrediction);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });
  
  // Update an existing prediction
  app.put("/api/predictions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid prediction ID" });
      }
      
      // Verify the prediction exists and belongs to the user
      const existingPrediction = await storage.getPrediction(id);
      
      if (!existingPrediction) {
        return res.status(404).json({ message: "Prediction not found" });
      }
      
      // If the prediction has a userId, only the owner should edit it
      if (existingPrediction.userId && existingPrediction.userId !== req.session?.userId) {
        return res.status(403).json({ message: "Not authorized to update this prediction" });
      }
      
      // Check if the prediction is still editable (30 mins before match start)
      const isEditable = await storage.isPredictionEditable(id);
      
      if (!isEditable) {
        return res.status(400).json({ message: "Prediction is no longer editable" });
      }
      
      const validatedData = predictSchema.partial().parse(req.body);
      const updatedPrediction = await storage.updatePrediction(id, validatedData);
      
      res.json(updatedPrediction);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
