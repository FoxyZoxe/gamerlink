import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { publicUser } from "../lib/shape.js";

export const squadsRouter = Router();

function hydrateSquad(squad, data) {
  const game = data.games.find((g) => g.id === squad.game_id) || null;
  const members = data.squadMembers
    .filter((m) => m.squad_id === squad.id)
    .map((m) => data.users.find((u) => u.id === m.user_id))
    .filter(Boolean)
    .map(publicUser);
  return { ...squad, game, members, memberCount: members.length };
}

squadsRouter.get("/", requireAuth, async (req, res) => {
  const data = await db.read();
  const gameId = req.query.game;
  const squads = data.squads
    .filter((s) => !gameId || s.game_id === gameId)
    .map((s) => hydrateSquad(s, data))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ squads });
});

squadsRouter.get("/mine", requireAuth, async (req, res) => {
  const data = await db.read();
  const ids = new Set(data.squadMembers.filter((m) => m.user_id === req.userId).map((m) => m.squad_id));
  const squads = data.squads.filter((s) => ids.has(s.id)).map((s) => hydrateSquad(s, data));
  res.json({ squads });
});

squadsRouter.post("/", requireAuth, async (req, res) => {
  const { gameId, name, description = "" } = req.body || {};
  const cleanName = String(name || "").trim();
  if (!gameId || !cleanName) return res.status(400).json({ error: "Le jeu et le nom de la squad sont requis." });
  if (cleanName.length > 40) return res.status(400).json({ error: "Le nom de la squad est trop long." });

  const data = await db.read();
  if (!data.games.some((g) => g.id === gameId)) return res.status(404).json({ error: "Jeu introuvable." });

  const squad = {
    id: db.id(),
    owner_id: req.userId,
    game_id: gameId,
    name: cleanName,
    description: String(description).trim().slice(0, 160),
    created_at: new Date().toISOString(),
  };

  await db.write((d) => {
    d.squads.push(squad);
    d.squadMembers.push({ squad_id: squad.id, user_id: req.userId });
  });

  res.status(201).json({ squad: hydrateSquad(squad, await db.read()) });
});

squadsRouter.post("/:id/join", requireAuth, async (req, res) => {
  const result = await db.write((d) => {
    const squad = d.squads.find((s) => s.id === req.params.id);
    if (!squad) return { error: "Squad introuvable." };
    const exists = d.squadMembers.some((m) => m.squad_id === squad.id && m.user_id === req.userId);
    if (exists) return { error: "Tu es déjà dans cette squad." };
    const count = d.squadMembers.filter((m) => m.squad_id === squad.id).length;
    if (count >= 8) return { error: "Cette squad est complète." };
    d.squadMembers.push({ squad_id: squad.id, user_id: req.userId });
    return { squad };
  });
  if (result.error) return res.status(409).json({ error: result.error });
  const data = await db.read();
  res.json({ squad: hydrateSquad(result.squad, data) });
});

squadsRouter.post("/:id/leave", requireAuth, async (req, res) => {
  const result = await db.write((d) => {
    const squad = d.squads.find((s) => s.id === req.params.id);
    if (!squad) return { error: "Squad introuvable." };
    if (squad.owner_id === req.userId) return { error: "Le créateur doit supprimer la squad pour la fermer." };
    d.squadMembers = d.squadMembers.filter((m) => !(m.squad_id === squad.id && m.user_id === req.userId));
    return { ok: true };
  });
  if (result.error) return res.status(409).json({ error: result.error });
  res.json({ ok: true });
});

squadsRouter.delete("/:id", requireAuth, async (req, res) => {
  const result = await db.write((d) => {
    const squad = d.squads.find((s) => s.id === req.params.id);
    if (!squad) return { error: "Squad introuvable." };
    if (squad.owner_id !== req.userId) return { error: "Seul le créateur peut fermer cette squad." };
    d.squads = d.squads.filter((s) => s.id !== squad.id);
    d.squadMembers = d.squadMembers.filter((m) => m.squad_id !== squad.id);
    return { ok: true };
  });
  if (result.error) return res.status(403).json({ error: result.error });
  res.json({ ok: true });
});

squadsRouter.post("/:id/invite/:userId", requireAuth, async (req, res) => {
  const result = await db.write((d) => {
    const squad = d.squads.find((s) => s.id === req.params.id);
    const target = d.users.find((u) => u.id === req.params.userId);
    const member = d.squadMembers.some((m) => m.squad_id === req.params.id && m.user_id === req.userId);
    if (!squad || !target) return { error: "Squad ou joueur introuvable." };
    if (!member) return { error: "Tu dois être membre de la squad pour inviter quelqu'un." };
    if (d.squadMembers.some((m) => m.squad_id === squad.id && m.user_id === target.id)) return { error: "Ce joueur est déjà dans la squad." };
    d.notifications.push({
      id: db.id(), user_id: target.id, type: "squad_invite",
      content: `Tu as été invité à rejoindre « ${squad.name} »`, actor_id: req.userId,
      squad_id: squad.id, created_at: new Date().toISOString(), read: false,
    });
    return { ok: true };
  });
  if (result.error) return res.status(409).json({ error: result.error });
  res.json({ ok: true });
});
