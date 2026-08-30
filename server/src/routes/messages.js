import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { publicUser } from "../lib/shape.js";

export const messagesRouter = Router();

// Liste des conversations (une par ami avec qui on a échangé), triée par
// dernier message. Suffisant pour la V0.1 ; passera sur des sockets en V0.2.
messagesRouter.get("/conversations", requireAuth, async (req, res) => {
  const meId = req.userId;
  const data = await db.read();

  const related = data.messages.filter((m) => m.sender_id === meId || m.receiver_id === meId);
  const byPartner = new Map();

  for (const m of related) {
    const partnerId = m.sender_id === meId ? m.receiver_id : m.sender_id;
    const existing = byPartner.get(partnerId);
    if (!existing || new Date(m.created_at) > new Date(existing.created_at)) {
      byPartner.set(partnerId, m);
    }
  }

  const conversations = [...byPartner.entries()]
    .map(([partnerId, lastMessage]) => {
      const partner = data.users.find((u) => u.id === partnerId);
      if (!partner) return null;
      const unread = related.filter((m) => m.sender_id === partnerId && m.receiver_id === meId && !m.read).length;
      return { partner: publicUser(partner), lastMessage, unread };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at));

  res.json({ conversations });
});

messagesRouter.get("/with/:userId", requireAuth, async (req, res) => {
  const meId = req.userId;
  const otherId = req.params.userId;
  const data = await db.read();

  const thread = data.messages
    .filter(
      (m) =>
        (m.sender_id === meId && m.receiver_id === otherId) || (m.sender_id === otherId && m.receiver_id === meId)
    )
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  await db.write((d) => {
    d.messages
      .filter((m) => m.sender_id === otherId && m.receiver_id === meId && !m.read)
      .forEach((m) => (m.read = true));
  });

  res.json({ messages: thread });
});

messagesRouter.post("/with/:userId", requireAuth, async (req, res) => {
  const meId = req.userId;
  const otherId = req.params.userId;
  const { content } = req.body || {};

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Le message ne peut pas être vide." });
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: "Message trop long (2000 caractères max)." });
  }

  const message = {
    id: db.id(),
    sender_id: meId,
    receiver_id: otherId,
    content: content.trim(),
    created_at: new Date().toISOString(),
    read: false,
  };

  await db.write((d) => {
    d.messages.push(message);
    d.notifications.push({
      id: db.id(),
      user_id: otherId,
      type: "message",
      content: "Nouveau message.",
      actor_id: meId,
      created_at: new Date().toISOString(),
      read: false,
    });
  });

  res.status(201).json({ message });
});

// ============================================================
// 💬 CHAT DE SQUAD
// ============================================================

// Vérifie que l'utilisateur est membre de la squad
async function getSquadMembership(squadId, userId) {
  const data = await db.read();

  const squad = data.squads.find(
    (s) => s.id === squadId
  );

  if (!squad) {
    return {
      data,
      error: "Squad introuvable.",
      status: 404,
    };
  }

  const member = data.squadMembers.some(
    (m) =>
      m.squad_id === squadId &&
      m.user_id === userId
  );

  if (!member) {
    return {
      data,
      error: "Tu dois être membre de cette squad.",
      status: 403,
    };
  }

  return {
    data,
    squad,
  };
}


// 📜 Récupérer les messages d'une squad
messagesRouter.get(
  "/squad/:squadId",
  requireAuth,
  async (req, res) => {
    const result = await getSquadMembership(
      req.params.squadId,
      req.userId
    );

    if (result.error) {
      return res
        .status(result.status)
        .json({ error: result.error });
    }

    const { data } = result;

    const messages = data.messages
      .filter(
        (message) =>
          message.squad_id === req.params.squadId
      )
      .sort(
        (a, b) =>
          new Date(a.created_at) -
          new Date(b.created_at)
      )
      .map((message) => {
        const sender = data.users.find(
          (user) =>
            user.id === message.sender_id
        );

        return {
          ...message,
          sender: sender
            ? publicUser(sender)
            : null,
        };
      });

    res.json({ messages });
  }
);


// 📨 Envoyer un message dans une squad
messagesRouter.post(
  "/squad/:squadId",
  requireAuth,
  async (req, res) => {
    const squadId = req.params.squadId;

    const result =
      await getSquadMembership(
        squadId,
        req.userId
      );

    if (result.error) {
      return res
        .status(result.status)
        .json({ error: result.error });
    }

    const { content } = req.body || {};

    if (
      !content ||
      !String(content).trim()
    ) {
      return res.status(400).json({
        error:
          "Le message ne peut pas être vide.",
      });
    }

    const cleanContent =
      String(content).trim();

    if (cleanContent.length > 2000) {
      return res.status(400).json({
        error:
          "Message trop long (2000 caractères max).",
      });
    }

    const message = {
      id: db.id(),
      sender_id: req.userId,
      receiver_id: null,
      squad_id: squadId,
      content: cleanContent,
      created_at:
        new Date().toISOString(),
      read: true,
    };

    await db.write((d) => {
      d.messages.push(message);
    });

    const data = await db.read();

    const sender = data.users.find(
      (user) =>
        user.id === req.userId
    );

    res.status(201).json({
      message: {
        ...message,
        sender: sender
          ? publicUser(sender)
          : null,
      },
    });
  }
);
