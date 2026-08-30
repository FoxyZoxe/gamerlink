import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const gamesRouter = Router();

// ==========================================================
// CATALOGUE
// ==========================================================

gamesRouter.get("/", requireAuth, async (req, res) => {
  const data = await db.read();

  res.json({
    games: data.games,
  });
});

// ==========================================================
// MES JEUX
// ==========================================================

gamesRouter.get("/mine", requireAuth, async (req, res) => {
  const data = await db.read();

  const mine = data.userGames
    .filter(
      (ug) =>
        ug.user_id === req.userId
    )
    .map((ug) => ({
      ...ug,
      game: data.games.find(
        (g) =>
          g.id === ug.game_id
      ),
    }));

  res.json({
    userGames: mine,
  });
});

// ==========================================================
// AJOUTER UN JEU À MA BIBLIOTHÈQUE
// ==========================================================

gamesRouter.post(
  "/mine/:gameId",
  requireAuth,
  async (req, res) => {
    const data = await db.read();

    const game = data.games.find(
      (g) =>
        g.id === req.params.gameId
    );

    if (!game) {
      return res.status(404).json({
        error:
          "Jeu introuvable dans le catalogue.",
      });
    }

    await db.write((d) => {
      const exists =
        d.userGames.find(
          (ug) =>
            ug.user_id ===
              req.userId &&
            ug.game_id ===
              req.params.gameId
        );

      if (!exists) {
        d.userGames.push({
          user_id: req.userId,
          game_id:
            req.params.gameId,
          playtime_minutes: 0,
        });
      }
    });

    res.status(201).json({
      ok: true,
    });
  }
);

// ==========================================================
// TEMPS DE JEU
// ==========================================================
//
// Ajoute une session de jeu au total du joueur.
//
// Exemple :
// Minecraft = 120 minutes
// nouvelle session = 37 minutes
// nouveau total = 157 minutes
//
// ==========================================================

gamesRouter.post(
  "/playtime",
  requireAuth,
  async (req, res) => {
    const {
      gameId,
      minutes,
    } = req.body || {};

    // ------------------------------------------------------
    // Vérification du jeu
    // ------------------------------------------------------

    if (!gameId) {
      return res.status(400).json({
        error:
          "gameId est obligatoire.",
      });
    }

    // ------------------------------------------------------
    // Vérification du temps
    // ------------------------------------------------------

    const sessionMinutes =
      Number(minutes);

    if (
      !Number.isFinite(
        sessionMinutes
      ) ||
      sessionMinutes <= 0
    ) {
      return res.status(400).json({
        error:
          "Le nombre de minutes doit être supérieur à 0.",
      });
    }

    // On arrondit à la minute
    const minutesToAdd =
      Math.floor(
        sessionMinutes
      );

    if (minutesToAdd <= 0) {
      return res.status(400).json({
        error:
          "La session est trop courte pour être enregistrée.",
      });
    }

    // ------------------------------------------------------
    // Sauvegarde
    // ------------------------------------------------------

    const result =
      await db.write((d) => {
        const game =
          d.games.find(
            (g) =>
              g.id === gameId
          );

        if (!game) {
          return {
            error:
              "Jeu introuvable.",
          };
        }

        let userGame =
          d.userGames.find(
            (ug) =>
              ug.user_id ===
                req.userId &&
              ug.game_id ===
                gameId
          );

        // Si le jeu n'est pas encore
        // dans la bibliothèque,
        // on le crée automatiquement.
        if (!userGame) {
          userGame = {
            user_id:
              req.userId,
            game_id:
              gameId,
            playtime_minutes: 0,
          };

          d.userGames.push(
            userGame
          );
        }

        const previousMinutes =
          Number(
            userGame.playtime_minutes ||
              0
          );

        userGame.playtime_minutes =
          previousMinutes +
          minutesToAdd;

        return {
          game,
          previousMinutes,
          addedMinutes:
            minutesToAdd,
          totalMinutes:
            userGame.playtime_minutes,
        };
      });

    if (result.error) {
      return res.status(400).json({
        error:
          result.error,
      });
    }

    console.log(
      `⏱️ ${result.game.name} : +${result.addedMinutes} min → ${result.totalMinutes} min`
    );

    res.json({
      ok: true,
      game: result.game,
      addedMinutes:
        result.addedMinutes,
      totalMinutes:
        result.totalMinutes,
    });
  }
);

// ==========================================================
// JEU ACTUEL
// ==========================================================

gamesRouter.patch(
  "/status",
  requireAuth,
  async (req, res) => {
    const {
      gameId,
    } = req.body || {};

    const result =
      await db.write((d) => {
        const user =
          d.users.find(
            (u) =>
              u.id ===
              req.userId
          );

        if (!user) {
          return {
            error:
              "Utilisateur introuvable.",
          };
        }

        // --------------------------------------------------
        // ARRÊT DU JEU
        // --------------------------------------------------

        if (
          gameId === null ||
          gameId === ""
        ) {
          user.status =
            "online";

          user.current_game_id =
            null;

          user.custom_status =
            "";

          return {
            user,
          };
        }

        // --------------------------------------------------
        // DÉMARRAGE DU JEU
        // --------------------------------------------------

        const game =
          d.games.find(
            (g) =>
              g.id === gameId
          );

        if (!game) {
          return {
            error:
              "Jeu introuvable.",
          };
        }

        user.status =
          "in_game";

        user.current_game_id =
          game.id;

        user.custom_status =
          game.name;

        return {
          user,
          game,
        };
      });

    if (result.error) {
      return res.status(400).json({
        error:
          result.error,
      });
    }

    res.json({
      user: result.user,
      game:
        result.game || null,
    });
  }
);