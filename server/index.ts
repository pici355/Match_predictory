import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { PgStore } from "./db";
import { runPrizeMigration } from "./prize-migration";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set up session management
app.use(session({
  store: PgStore,
  secret: process.env.SESSION_SECRET || 'fantaschedina-secret',
  resave: true, // Cambiato a true per garantire la persistenza della sessione
  saveUninitialized: true, // Cambiato a true per creare sempre una sessione
  cookie: {
    secure: false, // Impostato a false per consentire l'uso senza HTTPS in development
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    sameSite: 'lax', // Aggiungiamo questa impostazione per problemi di browser moderni
  }
}));

// Debug middleware per tracciare le sessioni
app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Run the prize distribution migration to update schema
  try {
    await runPrizeMigration();
    log("Prize distribution migration completed");
  } catch (error) {
    log(`Prize distribution migration error: ${error}`);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
 const port = process.env.PORT || 5000; // prendi la porta da Render o usa 5000 in locale
server.listen({
  port,
  host: "0.0.0.0",
  reusePort: true,
}, () => {
  log(`serving on port ${port}`);
});
})();
