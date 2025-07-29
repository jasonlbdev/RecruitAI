import express from "express";
import cors from "cors";
import { initDatabase } from "./database";
import { handleDemo } from "./routes/demo";

// Import auth routes
import { login, register, logout, refreshToken, getMe } from "./routes/auth";
import { authenticateToken } from "./middleware/auth";

// Import business logic routes
import { getJobs, getJob, createJob, updateJob, deleteJob } from "./routes/jobs";
import { getCandidates, getCandidate, createCandidate, updateCandidate, deleteCandidate } from "./routes/candidates";
import { getDashboardMetrics } from "./routes/dashboard";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize database
  initDatabase().catch(console.error);

  // Health check endpoints
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "Hello from Express server v2!" });
  });

  app.get("/api/demo", handleDemo);

  // Authentication routes (public)
  app.post("/api/auth/login", login);
  app.post("/api/auth/register", register);
  app.post("/api/auth/refresh", refreshToken);

  // Protected authentication routes
  app.post("/api/auth/logout", authenticateToken, logout);
  app.get("/api/auth/me", authenticateToken, getMe);

  // Dashboard routes (protected)
  app.get("/api/dashboard/metrics", authenticateToken, getDashboardMetrics);

  // Job management routes (protected)
  app.get("/api/jobs", authenticateToken, getJobs);
  app.post("/api/jobs", authenticateToken, createJob);
  app.get("/api/jobs/:id", authenticateToken, getJob);
  app.put("/api/jobs/:id", authenticateToken, updateJob);
  app.delete("/api/jobs/:id", authenticateToken, deleteJob);

  // Candidate management routes (protected)
  app.get("/api/candidates", authenticateToken, getCandidates);
  app.post("/api/candidates", authenticateToken, createCandidate);
  app.get("/api/candidates/:id", authenticateToken, getCandidate);
  app.put("/api/candidates/:id", authenticateToken, updateCandidate);
  app.delete("/api/candidates/:id", authenticateToken, deleteCandidate);

  // TODO: Add more protected routes
  // app.get("/api/applications", authenticateToken, getApplications);
  // app.post("/api/files/upload", authenticateToken, uploadFile);
  // app.post("/api/applications/:id/ai-score", authenticateToken, generateAIScore);

  return app;
}
