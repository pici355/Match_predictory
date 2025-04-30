import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import { storage } from "./storage";
import { predictSchema, matchSchema, userSchema } from "@shared/schema";
import { z } from "zod";
import { sendPredictionNotification, sendExcelImportReport } from "./email";

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

// Middleware to check if the user is an admin
const isAdmin = async (req: Request, res: Response, next: Function) => {
  const userId = req.session?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  try {
    const user = await storage.getUser(userId);
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    next();
  } catch (error) {
    console.error("Error in admin check middleware:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
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
      const validatedData = userSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
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
        password: z.string(),
      });
      
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
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
      const validatedData = matchSchema.parse(req.body);
      const match = await storage.createMatch(validatedData);
      res.status(201).json(match);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
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
  
  app.get("/api/predictions/user", async (req, res) => {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const predictions = await storage.getPredictionsByUserId(userId);
      res.json(predictions);
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

  // POST a new prediction
  app.post("/api/predictions", async (req, res) => {
    try {
      const validatedData = predictSchema.parse(req.body);
      
      // If user is logged in, attach user ID
      if (req.session?.userId) {
        validatedData.userId = req.session.userId;
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
