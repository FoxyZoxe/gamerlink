import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

export default function GameDetectionWatcher() {
  const { user, loading, refreshUser } = useAuth();

  const lastSyncedGame = useRef("__initial__");

  // Jeu actuellement joué
  const currentGame = useRef(null);

  // Heure de début de la session
  const gameStartTime = useRef(null);

  // Dernière minute déjà envoyée au serveur
  const lastSavedMinute = useRef(0);

  useEffect(() => {
    console.log("🎮 GameDetectionWatcher démarré");

    if (loading) {
      console.log("⏳ Authentification en cours...");
      return;
    }

    if (!user) {
      console.log(
        "🔒 Utilisateur non connecté : synchronisation désactivée."
      );
      return;
    }

    if (!window.gamerlinkDesktop) {
      console.error(
        "❌ gamerlinkDesktop n'est pas disponible."
      );
      return;
    }

    console.log(
      "✅ Utilisateur connecté :",
      user.username
    );

    console.log(
      "✅ gamerlinkDesktop disponible"
    );

    let stopped = false;

    // ==========================================================
    // SAUVEGARDE DU TEMPS
    // ==========================================================

    async function savePlaytime() {
      if (
        stopped ||
        !currentGame.current ||
        !gameStartTime.current
      ) {
        return;
      }

      const elapsedSeconds = Math.floor(
        (Date.now() -
          gameStartTime.current) /
          1000
      );

      const elapsedMinutes = Math.floor(
        elapsedSeconds / 60
      );

      // Rien de nouveau à sauvegarder
      if (
        elapsedMinutes <=
        lastSavedMinute.current
      ) {
        return;
      }

      const minutesToSave =
        elapsedMinutes -
        lastSavedMinute.current;

      const game =
        currentGame.current;

      const gameId =
        game.id ||
        game.gameId ||
        game._id;

      if (!gameId) {
        console.error(
          "❌ Impossible de sauvegarder le temps : ID du jeu manquant.",
          game
        );

        return;
      }

      try {
        console.log(
          `💾 Sauvegarde : +${minutesToSave} min pour ${game.name}`
        );

        const result =
          await api.addPlaytime(
            gameId,
            minutesToSave
          );

        lastSavedMinute.current =
          elapsedMinutes;

        console.log(
          `✅ Temps sauvegardé : ${result.totalMinutes} min au total`
        );

        // Informe Games.jsx
        window.dispatchEvent(
          new CustomEvent(
            "gamerlink-playtime-saved",
            {
              detail: {
                gameId,
                addedMinutes:
                  minutesToSave,
                totalMinutes:
                  result.totalMinutes,
              },
            }
          )
        );
      } catch (error) {
        console.error(
          "❌ Erreur sauvegarde temps :",
          error
        );

        // IMPORTANT :
        // On ne modifie PAS lastSavedMinute.
        // La minute sera donc réessayée
        // au prochain passage.
      }
    }

    // ==========================================================
    // COMPTEUR EN DIRECT
    // ==========================================================

    function sendPlaytimeUpdate() {
      if (
        stopped ||
        !currentGame.current ||
        !gameStartTime.current
      ) {
        return;
      }

      const elapsedSeconds =
        Math.floor(
          (Date.now() -
            gameStartTime.current) /
            1000
        );

      window.dispatchEvent(
        new CustomEvent(
          "gamerlink-playtime-updated",
          {
            detail: {
              game:
                currentGame.current,
              seconds:
                elapsedSeconds,
              minutes:
                Math.floor(
                  elapsedSeconds / 60
                ),
            },
          }
        )
      );
    }

    // ==========================================================
    // FIN DE SESSION
    // ==========================================================

    async function finishGame() {
      if (
        !currentGame.current ||
        !gameStartTime.current
      ) {
        return;
      }

      console.log(
        `🏁 Fin de session : ${currentGame.current.name}`
      );

      // Sauvegarde les dernières minutes
      await savePlaytime();

      currentGame.current = null;
      gameStartTime.current = null;
      lastSavedMinute.current = 0;

      window.dispatchEvent(
        new CustomEvent(
          "gamerlink-playtime-updated",
          {
            detail: {
              game: null,
              seconds: 0,
              minutes: 0,
            },
          }
        )
      );
    }

    // ==========================================================
    // SYNCHRONISATION DU JEU
    // ==========================================================

    async function updateGame(gameName) {
      if (stopped) {
        return;
      }

      const normalizedGame = gameName
        ? String(gameName)
            .toLowerCase()
            .trim()
        : null;

      // Même état qu'avant
      if (
        lastSyncedGame.current ===
        normalizedGame
      ) {
        return;
      }

      lastSyncedGame.current =
        normalizedGame;

      try {
        // ======================================================
        // AUCUN JEU
        // ======================================================

        if (!gameName) {
          console.log(
            "🖥️ Aucun jeu détecté."
          );

          await finishGame();

          await api.setCurrentGame(
            null
          );

          console.log(
            "✅ Statut GamerLink remis en ligne."
          );

          await refreshUser();

          window.dispatchEvent(
            new CustomEvent(
              "gamerlink-game-updated",
              {
                detail: {
                  game: null,
                },
              }
            )
          );

          return;
        }

        // ======================================================
        // JEU DÉTECTÉ
        // ======================================================

        console.log(
          `🌐 Synchronisation : ${gameName}`
        );

        const result =
          await api.getGamesCatalog();

        const games =
          result?.games ||
          result ||
          [];

        const normalizedName =
          String(gameName)
            .toLowerCase()
            .trim();

        const game =
          games.find(
            (item) => {
              const name =
                String(
                  item.name ||
                    item.title ||
                    ""
                )
                  .toLowerCase()
                  .trim();

              return (
                name ===
                normalizedName
              );
            }
          );

        if (!game) {
          console.warn(
            `⚠️ ${gameName} n'existe pas dans le catalogue GamerLink.`
          );

          return;
        }

        const gameId =
          game.id ||
          game.gameId ||
          game._id;

        if (!gameId) {
          console.error(
            "❌ Aucun ID trouvé pour :",
            game
          );

          return;
        }

        // ======================================================
        // CHANGEMENT DIRECT DE JEU
        // ======================================================

        if (
          currentGame.current &&
          currentGame.current.id !==
            gameId
        ) {
          console.log(
            `🔄 Changement de jeu : ${currentGame.current.name} → ${game.name}`
          );

          await finishGame();
        }

        // ======================================================
        // DÉMARRAGE
        // ======================================================

        currentGame.current =
          game;

        gameStartTime.current =
          Date.now();

        lastSavedMinute.current =
          0;

        console.log(
          `⏱️ Compteur démarré pour ${game.name}`
        );


console.log(
  "🧪 setCurrentGame disponible :",
  typeof api.setCurrentGame
);


        await api.setCurrentGame(
          gameId
        );

        console.log(
          `✅ Jeu synchronisé : ${game.name}`
        );

        await refreshUser();

        // Préviens Games.jsx
        window.dispatchEvent(
          new CustomEvent(
            "gamerlink-game-updated",
            {
              detail: {
                game,
                startTime:
                  gameStartTime.current,
                seconds: 0,
                minutes: 0,
              },
            }
          )
        );
      } catch (error) {
        console.error(
          "❌ Erreur synchronisation jeu :",
          error
        );

        lastSyncedGame.current =
          "__error__";
      }
    }

    // ==========================================================
    // RÉCEPTION DU JEU DEPUIS ELECTRON
    // ==========================================================

    const unsubscribe =
      window.gamerlinkDesktop.onGameDetected(
        (gameName) => {
          console.log(
            "📥 Jeu reçu par React :",
            gameName ||
              "aucun jeu"
          );

          updateGame(gameName);
        }
      );

    // ==========================================================
    // COMPTEUR EN DIRECT
    // ==========================================================

    const playtimeInterval =
      setInterval(() => {
        sendPlaytimeUpdate();
      }, 1000);

    // ==========================================================
    // SAUVEGARDE AUTOMATIQUE
    // ==========================================================

    const saveInterval =
      setInterval(() => {
        savePlaytime();
      }, 60000);

    // ==========================================================
    // NETTOYAGE
    // ==========================================================

    return () => {
      stopped = true;

      clearInterval(
        playtimeInterval
      );

      clearInterval(
        saveInterval
      );

      if (
        typeof unsubscribe ===
        "function"
      ) {
        unsubscribe();
      }
    };
  }, [
    user,
    loading,
    refreshUser,
  ]);

  return null;
}