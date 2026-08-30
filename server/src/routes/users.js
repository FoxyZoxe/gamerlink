import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { publicUser } from "../lib/shape.js";

export const usersRouter = Router();

const EDITABLE_FIELDS = [
  "avatar",
  "banner",
  "description",
  "favorite_games",
  "language",
  "timezone",
  "custom_status",
  "privacy",
];

/* ==========================================================
   MON PROFIL
   GET /api/users/me
========================================================== */

usersRouter.get("/me", requireAuth, async (req, res) => {
  const data = await db.read();

  const user = data.users.find(
    (u) => u.id === req.userId
  );

  if (!user) {
    return res.status(404).json({
      error: "Utilisateur introuvable.",
    });
  }

  res.json({
    user: publicUser(user),
  });
});

/* ==========================================================
   PROFIL PUBLIC
   GET /api/users/:id
========================================================== */

usersRouter.get("/:id", requireAuth, async (req, res) => {
  const data = await db.read();

  const user = data.users.find(
    (u) =>
      u.id === req.params.id ||
      u.username === req.params.id
  );

  if (!user) {
    return res.status(404).json({
      error: "Profil introuvable.",
    });
  }

  const friendsCount = data.friends.filter(
    (f) =>
      f.status === "accepted" &&
      (f.user_id === user.id ||
        f.friend_id === user.id)
  ).length;

  const playtime = data.userGames
    .filter((ug) => ug.user_id === user.id)
    .reduce(
      (sum, ug) => sum + ug.playtime_minutes,
      0
    );

  res.json({
    user: publicUser(user),
    friendsCount,
    playtimeMinutes: playtime,
  });
});

/* ==========================================================
   MODIFIER MON PROFIL
   PATCH /api/users/me
========================================================== */

usersRouter.patch("/me", requireAuth, async (req, res) => {
  const updates = req.body || {};

  const result = await db.write((d) => {
    const user = d.users.find(
      (u) => u.id === req.userId
    );

    if (!user) return null;

    for (const key of EDITABLE_FIELDS) {
      if (key in updates) {
        user[key] = updates[key];
      }
    }

    return user;
  });

  if (!result) {
    return res.status(404).json({
      error: "Utilisateur introuvable.",
    });
  }

  res.json({
    user: publicUser(result),
  });
});

/* ==========================================================
   SUPPRIMER MON COMPTE
   DELETE /api/users/me
========================================================== */

usersRouter.delete("/me", requireAuth, async (req, res) => {
  const meId = req.userId;

  await db.write((d) => {
    d.users = d.users.filter(
      (u) => u.id !== meId
    );

    d.friends = d.friends.filter(
      (f) =>
        f.user_id !== meId &&
        f.friend_id !== meId
    );

    d.messages = d.messages.filter(
      (m) =>
        m.sender_id !== meId &&
        m.receiver_id !== meId
    );

    d.notifications = d.notifications.filter(
      (n) => n.user_id !== meId
    );

    d.userGames = d.userGames.filter(
      (ug) => ug.user_id !== meId
    );
  });

  res.json({
    ok: true,
  });
});

/* ==========================================================
   CHANGER MON STATUT
   PATCH /api/users/me/status
========================================================== */

usersRouter.patch(
  "/me/status",
  requireAuth,
  async (req, res) => {
    const { status } = req.body || {};

    const allowed = [
      "online",
      "afk",
      "dnd",
      "invisible",
      "offline",
      "in_game",
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Statut invalide. Valeurs possibles : ${allowed.join(
          ", "
        )}`,
      });
    }

    const result = await db.write((d) => {
      const user = d.users.find(
        (u) => u.id === req.userId
      );

      if (user) {
        user.status = status;
      }

      return user;
    });

    res.json({
      user: publicUser(result),
    });
  }
);