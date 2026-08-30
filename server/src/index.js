import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { friendsRouter } from "./routes/friends.js";
import { messagesRouter } from "./routes/messages.js";
import { notificationsRouter } from "./routes/notifications.js";
import { gamesRouter } from "./routes/games.js";
import { squadsRouter } from "./routes/squads.js";

const app = express();

const PORT = process.env.PORT || 4000;

// ============================================================
// SERVEUR HTTP
// ============================================================

const httpServer = createServer(app);

// ============================================================
// SOCKET.IO
// ============================================================

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ============================================================
// EXPRESS
// ============================================================

app.use(cors());

app.use(
  express.json({
    limit: "10mb",
  })
);

// ============================================================
// LOG DES REQUÊTES
// ============================================================

app.use((req, _res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.path}`
  );

  next();
});

// ============================================================
// HEALTH
// ============================================================

app.get(
  "/api/health",
  (_req, res) =>
    res.json({
      status: "ok",
      service: "gamerlink-server",
    })
);

// ============================================================
// ROUTES API
// ============================================================

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/friends", friendsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/games", gamesRouter);
app.use("/api/squads", squadsRouter);

// ============================================================
// SOCKET.IO — CONNEXION
// ============================================================

io.on("connection", (socket) => {
  console.log(
    `🔌 Joueur connecté : ${socket.id}`
  );

  // ==========================================================
  // REJOINDRE UN SALON VOCAL
  // ==========================================================

  socket.on(
    "voice:join",
    ({ squadId, user }) => {
      if (!squadId || !user) {
        return;
      }

      const room = `voice:${squadId}`;

      socket.join(room);

      console.log(
        `🎙️ ${user.username} rejoint ${room}`
      );

      // Informer les autres joueurs
      socket.to(room).emit(
        "voice:user-joined",
        {
          socketId: socket.id,
          user,
        }
      );

      // Récupérer les sockets présents
      const roomSockets =
        io.sockets.adapter.rooms.get(room);

      const users = [];

      if (roomSockets) {
        for (const socketId of roomSockets) {
          if (socketId === socket.id) {
            continue;
          }

          const connectedSocket =
            io.sockets.sockets.get(socketId);

          if (
            connectedSocket?.data?.voiceUser
          ) {
            users.push({
              socketId,
              user:
                connectedSocket.data.voiceUser,
            });
          }
        }
      }

      socket.data.voiceUser = user;
      socket.data.voiceSquad = squadId;

      socket.emit(
        "voice:users",
        users
      );
    }
  );

  // ==========================================================
  // QUITTER UN SALON VOCAL
  // ==========================================================

  socket.on(
    "voice:leave",
    ({ squadId }) => {
      if (!squadId) {
        return;
      }

      const room = `voice:${squadId}`;

      socket.leave(room);

      console.log(
        `🚪 Joueur ${socket.id} quitte ${room}`
      );

      socket.to(room).emit(
        "voice:user-left",
        {
          socketId: socket.id,
        }
      );

      socket.data.voiceUser = null;
      socket.data.voiceSquad = null;
    }
  );

  // ==========================================================
  // SIGNAL WEBRTC
  // ==========================================================

  socket.on(
    "voice:offer",
    ({ target, offer }) => {
      if (!target || !offer) {
        return;
      }

      io.to(target).emit(
        "voice:offer",
        {
          from: socket.id,
          offer,
        }
      );
    }
  );

  socket.on(
    "voice:answer",
    ({ target, answer }) => {
      if (!target || !answer) {
        return;
      }

      io.to(target).emit(
        "voice:answer",
        {
          from: socket.id,
          answer,
        }
      );
    }
  );

  socket.on(
    "voice:ice-candidate",
    ({ target, candidate }) => {
      if (!target || !candidate) {
        return;
      }

      io.to(target).emit(
        "voice:ice-candidate",
        {
          from: socket.id,
          candidate,
        }
      );
    }
  );

  // ==========================================================
  // DÉCONNEXION
  // ==========================================================

  socket.on("disconnect", () => {
    const squadId =
      socket.data.voiceSquad;

    console.log(
      `🔌 Joueur déconnecté : ${socket.id}`
    );

    if (squadId) {
      const room = `voice:${squadId}`;

      socket.to(room).emit(
        "voice:user-left",
        {
          socketId: socket.id,
        }
      );
    }
  });
});

// ============================================================
// ROUTE INCONNUE
// ============================================================

app.use(
  (_req, res) => {
    res
      .status(404)
      .json({
        error: "Route inconnue.",
      });
  }
);

// ============================================================
// ERREURS
// ============================================================

app.use(
  (
    err,
    _req,
    res,
    _next
  ) => {
    console.error(err);

    res
      .status(500)
      .json({
        error:
          "Erreur serveur inattendue.",
      });
  }
);

// ============================================================
// DÉMARRAGE
// ============================================================

httpServer.listen(
  PORT,
  () => {
    console.log(
      `🎮 GamerLink API en écoute sur http://localhost:${PORT}`
    );

    console.log(
      "🎙️ Serveur vocal Socket.IO activé."
    );
  }
);