import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db.js";
import { JWT_SECRET, requireAuth } from "../middleware/auth.js";
import { publicUser } from "../lib/shape.js";

export const authRouter = Router();

function sign(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });
}

authRouter.post("/register", async (req, res) => {
  const { username, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Nom d'utilisateur, email et mot de passe sont requis." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
  }

  const data = await db.read();
  const clash = data.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase()
  );
  if (clash) {
    return res.status(409).json({ error: "Ce nom d'utilisateur ou cet email est déjà utilisé." });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const user = {
    id: db.id(),
    username,
    email,
    password_hash,
    avatar: null,
    banner: null,
    description: "",
    favorite_games: [],
    language: "fr",
    timezone: "Europe/Paris",
    status: "online",
    custom_status: "",
    privacy: { whoCanAddMe: "everyone", whoCanMessageMe: "friends", profileVisibility: "public" },
    created_at: new Date().toISOString(),
  };

  await db.write((d) => d.users.push(user));

  const token = sign(user.id);
  res.status(201).json({ token, user: publicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) {
    return res.status(400).json({ error: "Identifiant et mot de passe sont requis." });
  }

  const data = await db.read();
  const user = data.users.find(
    (u) => u.email.toLowerCase() === identifier.toLowerCase() || u.username.toLowerCase() === identifier.toLowerCase()
  );
  if (!user) return res.status(401).json({ error: "Identifiants incorrects." });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Identifiants incorrects." });

  await db.write((d) => {
    const u = d.users.find((x) => x.id === user.id);
    u.status = "online";
  });

  const token = sign(user.id);
  res.json({ token, user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const data = await db.read();
  const user = data.users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });
  res.json({ user: publicUser(user) });
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  await db.write((d) => {
    const u = d.users.find((x) => x.id === req.userId);
    if (u) u.status = "offline";
  });
  res.json({ ok: true });
});
