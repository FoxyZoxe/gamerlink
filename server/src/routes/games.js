import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const gamesRouter = Router();

// ============================================================
// CATALOGUE DES JEUX
// ============================================================

gamesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const data = await db.read();

    res.json({
      games: data.games || [],
    });
  } catch (error) {
    console.error("❌ Erreur catalogue jeux :", error);

    res.status(500).json({
      error: "Impossible de charger le catalogue.",
    });
  }
});

// ============================================================
// MES JEUX
// ============================================================

gamesRouter.get("/mine", requireAuth, async (req, res) => {
  try {
    const data = await db.read();

    const mine = (data.userGames || [])
      .filter(
        (ug) =>
          ug.user_id === req.userId
      )
      .map((ug) => ({
        ...ug,
        game:
          data.games?.find(
            (g) =>
              g.id === ug.game_id
          ) || null,
      }));

    res.json({
      userGames: mine,
    });
  } catch (error) {
    console.error(
      "❌ Erreur récupération jeux utilisateur :",
      error
    );

    res.status(500).json({
      error:
        "Impossible de charger tes jeux.",
    });
  }
});

// ============================================================
// AJOUTER UN JEU À LA BIBLIOTHÈQUE
// ============================================================

gamesRouter.post(
  "/mine/:gameId",
  requireAuth,
  async (req, res) => {
    try {
      const data = await db.read();

      const game = data.games?.find(
        (g) =>
          g.id === req.params.gameId
      );

      if (!game) {
        return res.status(404).json({
          error:
            "Jeu introuvable dans le catalogue.",
        });
      }

      const result = await db.write(
        (d) => {
          const exists =
            d.userGames.find(
              (ug) =>
                ug.user_id ===
                  req.userId &&
                ug.game_id ===
                  req.params.gameId
            );

          if (exists) {
            return {
              created: false,
              userGame: exists,
            };
          }

          const userGame = {
            user_id: req.userId,
            game_id:
              req.params.gameId,
            playtime_minutes: 0,
          };

          d.userGames.push(
            userGame
          );

          return {
            created: true,
            userGame,
          };
        }
      );

      res.status(
        result.created ? 201 : 200
      ).json({
        ok: true,
        userGame:
          result.userGame,
      });
    } catch (error) {
      console.error(
        "❌ Erreur ajout jeu :",
        error
      );

      res.status(500).json({
        error:
          "Impossible d'ajouter le jeu.",
      });
    }
  }
);

// ============================================================
// AJOUTER DU TEMPS DE JEU
// ============================================================
//
// Le client envoie uniquement le temps joué
// depuis la dernière sauvegarde.
//
// Exemple :
// {
//   "gameId": "g-minecraft",
//   "minutes": 1
// }
//
// Le serveur ajoute ces minutes au total existant.
// ============================================================

gamesRouter.post(
  "/playtime",
  requireAuth,
  async (req, res) => {
    try {
      const {
        gameId,
        minutes,
      } = req.body || {};

      if (!gameId) {
        return res.status(400).json({
          error:
            "gameId est obligatoire.",
        });
      }

      const addedMinutes =
        Number(minutes);

      if (
        !Number.isFinite(
          addedMinutes
        ) ||
        addedMinutes <= 0
      ) {
        return res.status(400).json({
          error:
            "Le nombre de minutes doit être supérieur à 0.",
        });
      }

      const result =
        await db.write((d) => {
          const game =
            d.games?.find(
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
              game_id: gameId,
              playtime_minutes: 0,
            };

            d.userGames.push(
              userGame
            );
          }

          const oldMinutes =
            Number(
              userGame.playtime_minutes ||
                0
            );

          const newMinutes =
            oldMinutes +
            addedMinutes;

          userGame.playtime_minutes =
            newMinutes;

          return {
            game,
            userGame,
            addedMinutes,
            totalMinutes:
              newMinutes,
          };
        });

      if (result.error) {
        return res.status(404).json({
          error: result.error,
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
        userGame:
          result.userGame,
      });
    } catch (error) {
      console.error(
        "❌ Erreur sauvegarde temps de jeu :",
        error
      );

      res.status(500).json({
        error:
          "Impossible de sauvegarder le temps de jeu.",
      });
    }
  }
);

// ============================================================
// STATUT / JEU ACTUEL
// ============================================================

gamesRouter.patch(
  "/status",
  requireAuth,
  async (req, res) => {
    try {
      const { gameId } =
        req.body || {};

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

          // ================================================
          // ARRÊT DU JEU
          // ================================================

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
              game: null,
            };
          }

          // ================================================
          // DÉMARRAGE DU JEU
          // ================================================

          const game =
            d.games?.find(
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
          error: result.error,
        });
      }

      res.json({
        user: result.user,
        game:
          result.game || null,
      });
    } catch (error) {
      console.error(
        "❌ Erreur changement statut jeu :",
        error
      );

      res.status(500).json({
        error:
          "Impossible de modifier le statut.",
      });
    }
  }
);