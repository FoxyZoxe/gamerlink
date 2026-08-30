import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { publicUser } from "../lib/shape.js";

export const friendsRouter = Router();

function otherUserId(edge, meId) {
  return edge.user_id === meId ? edge.friend_id : edge.user_id;
}

// Liste des amis (relations acceptées) + demandes reçues en attente.
friendsRouter.get("/", requireAuth, async (req, res) => {
  const data = await db.read();
  const meId = req.userId;

  const accepted = data.friends.filter(
    (f) => f.status === "accepted" && (f.user_id === meId || f.friend_id === meId)
  );
  const incoming = data.friends.filter((f) => f.status === "pending" && f.friend_id === meId);
  const outgoing = data.friends.filter((f) => f.status === "pending" && f.user_id === meId);

  const hydrate = (edge, idField = otherUserId(edge, meId)) => {
    const user = data.users.find((u) => u.id === idField);
    return user ? publicUser(user) : null;
  };

  res.json({
    friends: accepted.map((f) => hydrate(f)).filter(Boolean),
    incomingRequests: incoming.map((f) => hydrate(f, f.user_id)).filter(Boolean),
    outgoingRequests: outgoing.map((f) => hydrate(f, f.friend_id)).filter(Boolean),
  });
});

friendsRouter.post("/request/:targetId", requireAuth, async (req, res) => {
  const meId = req.userId;
  const targetId = req.params.targetId;
  if (meId === targetId) return res.status(400).json({ error: "Impossible de s'ajouter soi-même." });

  const data = await db.read();
  const target = data.users.find((u) => u.id === targetId);
  if (!target) return res.status(404).json({ error: "Joueur introuvable." });

  const existing = data.friends.find(
    (f) => (f.user_id === meId && f.friend_id === targetId) || (f.user_id === targetId && f.friend_id === meId)
  );
  if (existing) return res.status(409).json({ error: "Une relation existe déjà avec ce joueur." });

  await db.write((d) => {
    d.friends.push({ user_id: meId, friend_id: targetId, status: "pending" });
    d.notifications.push({
      id: db.id(),
      user_id: targetId,
      type: "friend_request",
      content: `${req.userId} vous a envoyé une demande d'ami.`,
      actor_id: meId,
      created_at: new Date().toISOString(),
      read: false,
    });
  });

  res.status(201).json({ ok: true });
});

friendsRouter.post("/accept/:requesterId", requireAuth, async (req, res) => {
  const meId = req.userId;
  const requesterId = req.params.requesterId;

  const result = await db.write((d) => {
    const edge = d.friends.find((f) => f.user_id === requesterId && f.friend_id === meId && f.status === "pending");
    if (!edge) return false;
    edge.status = "accepted";
    d.notifications.push({
      id: db.id(),
      user_id: requesterId,
      type: "friend_accept",
      content: "a accepté votre demande d'ami.",
      actor_id: meId,
      created_at: new Date().toISOString(),
      read: false,
    });
    return true;
  });

  if (!result) return res.status(404).json({ error: "Demande introuvable." });
  res.json({ ok: true });
});

friendsRouter.post("/decline/:requesterId", requireAuth, async (req, res) => {
  const meId = req.userId;
  await db.write((d) => {
    d.friends = d.friends.filter(
      (f) => !(f.user_id === req.params.requesterId && f.friend_id === meId && f.status === "pending")
    );
  });
  res.json({ ok: true });
});

friendsRouter.delete("/:friendId", requireAuth, async (req, res) => {
  const meId = req.userId;
  await db.write((d) => {
    d.friends = d.friends.filter(
      (f) =>
        !(
          (f.user_id === meId && f.friend_id === req.params.friendId) ||
          (f.user_id === req.params.friendId && f.friend_id === meId)
        )
    );
  });
  res.json({ ok: true });
});

friendsRouter.post("/block/:targetId", requireAuth, async (req, res) => {
  const meId = req.userId;
  const targetId = req.params.targetId;
  await db.write((d) => {
    d.friends = d.friends.filter(
      (f) => !((f.user_id === meId && f.friend_id === targetId) || (f.user_id === targetId && f.friend_id === meId))
    );
    d.friends.push({ user_id: meId, friend_id: targetId, status: "blocked" });
  });
  res.json({ ok: true });
});

// Trouver des joueurs — section 9 du cahier des charges.
// Filtre par jeu favori / langue / disponibilité micro et classe par score
// de compatibilité (nombre de critères correspondants).
friendsRouter.get("/search/players", requireAuth, async (req, res) => {
  const { game, language, mic, q } = req.query;
  const data = await db.read();

  let candidates = data.users.filter((u) => u.id !== req.userId);

  if (q) {
    const needle = String(q).toLowerCase();
    candidates = candidates.filter((u) => u.username.toLowerCase().includes(needle));
  }

  const scored = candidates.map((u) => {
    let score = 0;
    if (game && u.favorite_games?.some((g) => g.toLowerCase() === String(game).toLowerCase())) score += 2;
    if (language && u.language === language) score += 1;
    if (mic === "true" && u.mic_enabled) score += 1;
    return { user: u, score };
  });

  const results = scored
    .filter((s) => !game || s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map((s) => ({ ...publicUser(s.user), compatibility: s.score }));

  res.json({ results });
});
