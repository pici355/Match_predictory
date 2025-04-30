import { type Prediction, type InsertPrediction } from "@shared/schema";

// Storage interface
export interface IStorage {
  getAllPredictions(): Promise<Prediction[]>;
  getPrediction(id: number): Promise<Prediction | undefined>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
}

// In-memory implementation
export class MemStorage implements IStorage {
  private predictions: Map<number, Prediction>;
  private currentId: number;

  constructor() {
    this.predictions = new Map();
    this.currentId = 1;
  }

  async getAllPredictions(): Promise<Prediction[]> {
    return Array.from(this.predictions.values());
  }

  async getPrediction(id: number): Promise<Prediction | undefined> {
    return this.predictions.get(id);
  }

  async createPrediction(data: InsertPrediction): Promise<Prediction> {
    const id = this.currentId++;
    const now = new Date();
    
    const prediction: Prediction = {
      id,
      name: data.name,
      prediction: data.prediction,
      createdAt: now,
    };
    
    this.predictions.set(id, prediction);
    return prediction;
  }
}

export const storage = new MemStorage();
