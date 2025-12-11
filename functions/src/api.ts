// functions/src/api.ts
import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import { authMiddleware } from "./middleware/auth";
import { gameDefinitionsRouter } from "./routes/gameDefinitions";
import { gamesRouter } from "./routes/games";
import { profilesRouter } from "./routes/profiles";

const app = express();

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  next();
});

app.options("*", (req, res) => {
  res.status(204).end();
});

// Apply authentication to all routes
app.use(authMiddleware);

// Routes
app.use("/api/game-definitions", gameDefinitionsRouter);
app.use("/api/games", gamesRouter);
app.use("/api/profiles", profilesRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("API error:", err);
  res.status(err.statusCode || 500).json({
    error: err.code || "internal",
    message: err.message || "Internal server error",
  });

  next();
});

export const api = onRequest({ invoker: "public" }, app);