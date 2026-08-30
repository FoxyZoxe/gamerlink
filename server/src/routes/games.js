import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const gamesRouter = Router();

gamesRouter.get("/", requireAuth, async (req, res) => {
  const data = await db.read();
  res.json({ games: data.games });
});

gamesRouter.get("/mine", requireAuth, async (req, res) => {
  const data = await db.read();
  const mine = data.userGames
    .filter((ug) => ug.user_id === req.userId)
    .map((ug) => ({ ...ug, game: data.games.find((g) => g.id === ug.game_id) }));
  res.json({ userGames: mine });
});

gamesRouter.post("/mine/:gameId", requireAuth, async (req, res) => {
  const data = await db.read();
  const game = data.games.find((g) => g.id === req.params.gameId);
  if (!game) return res.status(404).json({ error: "Jeu introuvable dans le catalogue." });

  await db.write((d) => {
    const exists = d.userGames.find((ug) => ug.user_id === req.userId && ug.game_id === req.params.gameId);
    if (!exists) d.userGames.push({ user_id: req.userId, game_id: req.params.gameId, playtime_minutes: 0 });
  });

  res.status(201).json({ ok: true });
});


gamesRouter.patch("/status", requireAuth, async (req, res) => {
  const { gameId } = req.body || {};
  const result = await db.write((d) => {
    const user = d.users.find((u) => u.id === req.userId);
    if (!user) return { error: "Utilisateur introuvable." };
    if (gameId === null || gameId === "") {
      user.status = "online";
      user.current_game_id = null;
      user.custom_status = "";
      return { user };
    }
    const game = d.games.find((g) => g.id === gameId);
    if (!game) return { error: "Jeu introuvable." };
    user.status = "in_game";
    user.current_game_id = game.id;
    user.custom_status = game.name;
    return { user, game };
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ user: result.user, game: result.game || null });
});
