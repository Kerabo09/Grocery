import "dotenv/config";
import express from "express";
import cors from "cors";
import { staffRouter } from "./routes/staff";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/staff", staffRouter);

app.listen(PORT, () => {
  console.log(`FreshLogic API listening on http://localhost:${PORT}`);
});
