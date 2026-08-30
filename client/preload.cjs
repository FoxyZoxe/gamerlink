const {
  contextBridge,
  ipcRenderer,
} = require("electron");

let lastGame = null;

console.log("🔥 PRELOAD CHARGÉ");

ipcRenderer.on(
  "game-detected",
  (_event, game) => {
    lastGame = game;

    console.log(
      "🔥 PRELOAD REÇOIT :",
      game || "aucun jeu"
    );
  }
);

contextBridge.exposeInMainWorld(
  "gamerlinkDesktop",
  {
    onGameDetected(callback) {
      console.log(
        "🔥 Écouteur game-detected installé"
      );

      const listener =
        (_event, game) => {
          lastGame = game;
          callback(game);
        };

      ipcRenderer.on(
        "game-detected",
        listener
      );

      if (lastGame !== null) {
        callback(lastGame);
      }

      return () => {
        ipcRenderer.removeListener(
          "game-detected",
          listener
        );
      };
    },

    isGameRunning(game) {
      const gameName =
        typeof game === "object"
          ? game?.name
          : game;

      return ipcRenderer.invoke(
        "is-game-running",
        gameName
      );
    },

    launchGame(game) {
      const gameName =
        typeof game === "object"
          ? game?.name
          : game;

      return ipcRenderer.invoke(
        "launch-game",
        gameName
      );
    },
  }
);