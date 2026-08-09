import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { getProvider } from "./ai/provider.js";
import { config } from "./config.js";
import reviewRouter from "./routes/review.js";
import sessionsRouter from "./routes/sessions.js";
import translateRouter from "./routes/translate.js";
import vocabRouter from "./routes/vocab.js";
import { stats } from "./services/srs.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_req, res) => {
  const provider = getProvider();
  res.json({
    ok: true,
    provider: { name: provider.name, model: provider.model, configured: provider.configured },
    stats: stats(),
  });
});

app.use("/api/translate", translateRouter);
app.use("/api/vocab", vocabRouter);
app.use("/api/review", reviewRouter);
app.use("/api/sessions", sessionsRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  let message = "Internal server error";
  let status = 500;
  if (err instanceof Error) {
    message = err.message;
    if (err.name === "ZodError") status = 400;
  }
  res.status(status).json({ error: message });
});

if (fs.existsSync(config.webDist)) {
  app.use(express.static(config.webDist));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      res.sendFile(path.join(config.webDist, "index.html"));
    } else {
      next();
    }
  });
  console.log(`Serving web UI from ${config.webDist}`);
}

app.listen(config.port, () => {
  const provider = getProvider();
  console.log(`Zhong server on http://localhost:${config.port}`);
  console.log(
    provider.configured
      ? `AI provider: ${provider.name} (${provider.model})`
      : `Warning: ${provider.name} is not configured — set its API key in apps/server/.env`
  );
});