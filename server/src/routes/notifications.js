import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req, res) => {
  const data = await db.read();
  const mine = data.notifications
    .filter((n) => n.user_id === req.userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ notifications: mine });
});

notificationsRouter.post("/:id/read", requireAuth, async (req, res) => {
  await db.write((d) => {
    const n = d.notifications.find((x) => x.id === req.params.id && x.user_id === req.userId);
    if (n) n.read = true;
  });
  res.json({ ok: true });
});

notificationsRouter.post("/read-all", requireAuth, async (req, res) => {
  await db.write((d) => {
    d.notifications.filter((n) => n.user_id === req.userId).forEach((n) => (n.read = true));
  });
  res.json({ ok: true });
});
