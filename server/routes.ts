import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { predictSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // GET all predictions
  app.get("/api/predictions", async (_req, res) => {
    try {
      const predictions = await storage.getAllPredictions();
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch predictions" });
    }
  });

  // POST a new prediction
  app.post("/api/predictions", async (req, res) => {
    try {
      const validatedData = predictSchema.parse(req.body);
      const savedPrediction = await storage.createPrediction(validatedData);
      res.status(201).json(savedPrediction);
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
