import "dotenv/config";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../api/_lib/auth";

const app = express();

app.all("/api/auth", toNodeHandler(auth));
app.all("/api/auth/{*any}", toNodeHandler(auth));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use(express.json());

const port = 3000;
app.listen(port, () => {
  console.log(`Auth server listening on http://localhost:${port}`);
});
