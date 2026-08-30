import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { friendsRouter } from "./routes/friends.js";
import { messagesRouter } from "./routes/messages.js";
import { notificationsRouter } from "./routes/notifications.js";
import { gamesRouter } from "./routes/games.js";
import { squadsRouter } from "./routes/squads.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Petit garde-fou : on ne fait jamais confiance aux données du client sans
// validation dans chaque route (section 22 du cahier des charges).
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "gamerlink-server" }));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/friends", friendsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/games", gamesRouter);
app.use("/api/squads", squadsRouter);

app.use((_req, res) => res.status(404).json({ error: "Route inconnue." }));

// Gestion d'erreurs centralisée : jamais de stack trace exposée au client.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erreur serveur inattendue." });
});

app.listen(PORT, () => {
  console.log(`GamerLink API en écoute sur http://localhost:${PORT}`);
});
