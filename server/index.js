import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import runsRouter from "./routes/runs.js";
import { llmStatusForHealth } from "./services/llmConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/nxtwave_questions";

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  const llm = llmStatusForHealth();
  res.json({
    ok: true,
    mockLlm: llm.mode === "mock",
    llmProvider: llm.provider,
    mongo: mongoose.connection.readyState === 1,
  });
});

app.use("/api/runs", runsRouter);

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

async function connectMongo() {
  if (process.env.USE_IN_MEMORY_MONGO === "true") {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log("[mongo] in-memory (USE_IN_MEMORY_MONGO=true)");
    return;
  }

  await mongoose.connect(MONGODB_URI);
  console.log("[mongo] connected:", MONGODB_URI);
}

async function start() {
  try {
    await connectMongo();
  } catch (e) {
    console.error("[mongo] connection failed:", e.message);
    console.error("Set USE_IN_MEMORY_MONGO=true in server/.env or run: docker compose up -d");
    process.exit(1);
  }

  const llm = llmStatusForHealth();
  app.listen(PORT, () => {
    console.log(`[server] http://localhost:${PORT}`);
    if (llm.mode === "mock") {
      console.log("[server] Mock LLM — set GEMINI_API_KEY or OPENAI_API_KEY for live generation");
    } else {
      console.log(`[server] Live LLM: ${llm.provider}`);
    }
  });
}

start();
