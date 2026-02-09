import "dotenv/config";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../api/_lib/auth";
import gameSessionHandler from "../api/game/session";
import userProfileHandler from "../api/user/profile";

const app = express();

app.use(express.json());

app.all("/api/auth", toNodeHandler(auth));
app.all("/api/auth/{*any}", toNodeHandler(auth));

app.post("/api/game/session", (req, res) => {
  void gameSessionHandler(req, res);
});
app.get("/api/user/profile", (req, res) => {
  void userProfileHandler(req, res);
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

const port = 3000;
app.listen(port, () => {
  console.log(`Auth server listening on http://localhost:${port}`);
});
