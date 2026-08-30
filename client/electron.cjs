const {
  app,
  BrowserWindow,
  ipcMain,
} = require("electron");

const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { autoUpdater } = require("electron-updater");

let mainWindow = null;
let lastDetectedGame = null;
let detectionInterval = null;

// ============================================================
// CHARGEMENT DU CATALOGUE
// ============================================================

function loadGames() {
  try {
    const gamesPath = path.join(
      __dirname,
      "games",
      "games.json"
    );

    console.log(
      "📚 Chargement du catalogue :",
      gamesPath
    );

    const data = fs.readFileSync(
      gamesPath,
      "utf-8"
    );

    const games = JSON.parse(data);

    if (!Array.isArray(games)) {
      throw new Error(
        "games.json doit contenir un tableau."
      );
    }

    console.log(
      `✅ Catalogue chargé : ${games.length} jeux`
    );

    return games;
  } catch (error) {
    console.error(
      "❌ Impossible de charger games.json :",
      error.message
    );

    return [];
  }
}

const GAMES = loadGames();

// ============================================================
// NORMALISATION DES PROCESSUS
// ============================================================

function normalizeProcessName(name) {
  if (!name) {
    return "";
  }

  return String(name)
    .toLowerCase()
    .trim()
    .replace(/\.exe$/i, "");
}

// ============================================================
// RECHERCHE D'UN JEU
// ============================================================

function findGame(gameName) {
  if (!gameName) {
    return null;
  }

  const normalized =
    String(gameName)
      .toLowerCase()
      .trim();

  return (
    GAMES.find(
      (game) =>
        String(game.name)
          .toLowerCase()
          .trim() === normalized
    ) || null
  );
}

// ============================================================
// VÉRIFICATION SI UN JEU EST LANCÉ
// ============================================================

async function isGameRunning(gameName) {
  try {
    const game =
      findGame(gameName);

    if (!game) {
      return false;
    }

    const { default: psList } =
      await import("ps-list");

    const processes =
      await psList();

    const runningProcesses =
      new Set(
        processes
          .map((process) =>
            normalizeProcessName(
              process.name
            )
          )
          .filter(Boolean)
      );

    if (
      !Array.isArray(
        game.processes
      )
    ) {
      return false;
    }

    return game.processes.some(
      (processName) => {
        const normalized =
          normalizeProcessName(
            processName
          );

        return (
          normalized &&
          runningProcesses.has(
            normalized
          )
        );
      }
    );
  } catch (error) {
    console.error(
      "❌ Erreur vérification jeu :",
      error.message
    );

    return false;
  }
}

// ============================================================
// IPC : IS-GAME-RUNNING
// ============================================================

ipcMain.handle(
  "is-game-running",
  async (_event, gameName) => {
    try {
      if (
        typeof gameName ===
          "object" &&
        gameName !== null
      ) {
        gameName =
          gameName.name;
      }

      console.log(
        "🔎 Vérification du jeu :",
        gameName
      );

      const running =
        await isGameRunning(
          gameName
        );

      console.log(
        running
          ? `🟢 ${gameName} est lancé`
          : `⚫ ${gameName} n'est pas lancé`
      );

      return running;
    } catch (error) {
      console.error(
        "❌ Erreur IPC is-game-running :",
        error.message
      );

      return false;
    }
  }
);

// ============================================================
// IPC : LAUNCH-GAME
// ============================================================

ipcMain.handle(
  "launch-game",
  async (_event, gameName) => {
    try {
      if (
        typeof gameName ===
          "object" &&
        gameName !== null
      ) {
        gameName =
          gameName.name;
      }

      console.log(
        "🚀 Lancement demandé :",
        gameName
      );

      const game =
        findGame(gameName);

      if (!game) {
        throw new Error(
          `Jeu introuvable : ${gameName}`
        );
      }

      // ======================================================
      // LANCEMENT VIA URL
      // ======================================================

      if (game.launchUrl) {
        console.log(
          "🔗 Ouverture :",
          game.launchUrl
        );

        exec(
          `start "" "${game.launchUrl}"`,
          (error) => {
            if (error) {
              console.error(
                "❌ Erreur lancement URL :",
                error.message
              );
            }
          }
        );

        return {
          success: true,
          game: game.name,
        };
      }

      // ======================================================
      // LANCEMENT VIA EXECUTABLE
      // ======================================================

      if (game.executable) {
        console.log(
          "⚙️ Exécutable :",
          game.executable
        );

        exec(
          `"${game.executable}"`,
          (error) => {
            if (error) {
              console.error(
                "❌ Erreur lancement EXE :",
                error.message
              );
            }
          }
        );

        return {
          success: true,
          game: game.name,
        };
      }

      throw new Error(
        "Aucune méthode de lancement configurée pour ce jeu."
      );
    } catch (error) {
      console.error(
        "❌ Erreur launch-game :",
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }
);

// ============================================================
// DÉTECTION AUTOMATIQUE
// ============================================================

async function detectGame() {
  try {
    const { default: psList } =
      await import("ps-list");

    const processes =
      await psList();

    const runningProcesses =
      new Set(
        processes
          .map((process) =>
            normalizeProcessName(
              process.name
            )
          )
          .filter(Boolean)
      );

    let detectedGame = null;

    for (const game of GAMES) {
      if (
        !game ||
        !game.name ||
        !Array.isArray(
          game.processes
        )
      ) {
        continue;
      }

      const found =
        game.processes.some(
          (processName) => {
            const normalized =
              normalizeProcessName(
                processName
              );

            return (
              normalized &&
              runningProcesses.has(
                normalized
              )
            );
          }
        );

      if (found) {
        detectedGame =
          game.name;

        console.log(
          `🎯 Processus correspondant : ${game.name}`
        );

        break;
      }
    }

    // ========================================================
    // PAS DE CHANGEMENT
    // ========================================================

    if (
      detectedGame ===
      lastDetectedGame
    ) {
      return;
    }

    lastDetectedGame =
      detectedGame;

    // ========================================================
    // AFFICHAGE
    // ========================================================

    if (detectedGame) {
      console.log(
        `🎮 Jeu détecté : ${detectedGame}`
      );
    } else {
      console.log(
        "🖥️ Aucun jeu détecté"
      );
    }

    // ========================================================
    // ENVOI À REACT
    // ========================================================

    if (
      mainWindow &&
      !mainWindow.isDestroyed()
    ) {
      console.log(
        `📡 Envoi à React : ${
          detectedGame ||
          "aucun jeu"
        }`
      );

      mainWindow.webContents.send(
        "game-detected",
        detectedGame
      );
    }
  } catch (error) {
    console.error(
      "❌ Erreur détection :",
      error.message
    );
  }
}

// ============================================================
// CRÉATION DE LA FENÊTRE
// ============================================================

function createWindow() {
  const preloadPath =
    path.join(
      __dirname,
      "preload.cjs"
    );

  console.log(
    "📁 Preload :",
    preloadPath
  );

  mainWindow =
    new BrowserWindow({
      width: 1400,
      height: 900,

      minWidth: 1000,
      minHeight: 650,

      backgroundColor:
        "#080812",

      autoHideMenuBar: true,

      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: preloadPath,
      },
    });

  // ==========================================================
  // ERREUR PRELOAD
  // ==========================================================

  mainWindow.webContents.on(
    "preload-error",
    (
      _event,
      preloadPath,
      error
    ) => {
      console.error(
        "❌ ERREUR PRELOAD :",
        preloadPath
      );

      console.error(error);
    }
  );

  // ==========================================================
  // PAGE CHARGÉE
  // ==========================================================

  mainWindow.webContents.on(
    "did-finish-load",
    () => {
      console.log(
        "✅ Page GamerLink chargée"
      );

      setTimeout(() => {
        detectGame();
      }, 1000);
    }
  );

  // ==========================================================
  // CHARGEMENT
  // ==========================================================

  mainWindow.loadFile(
    path.join(
      __dirname,
      "dist",
      "index.html"
    )
  );
}

// ============================================================
// DÉMARRAGE
// ============================================================

app.whenReady().then(
  async () => {
    createWindow();

    console.log(
      "🎮 Détection automatique des jeux activée."
    );

    await detectGame();

    detectionInterval =
      setInterval(
        () => {
          detectGame();
        },
        5000
      );

    // ========================================================
// AUTO UPDATE
// ========================================================

if (!app.isPackaged) {
  console.log(
    "🔧 Mode développement : auto-update désactivé."
  );
} else {
  console.log(
    "🔄 Vérification des mises à jour..."
  );

  autoUpdater.on("checking-for-update", () => {
    console.log("🔎 Recherche d'une nouvelle version...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log(
      `🆕 Mise à jour disponible : ${info.version}`
    );
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log(
      `✅ GamerLink est à jour (${info.version}).`
    );
  });

  autoUpdater.on("error", (error) => {
    console.error(
      "❌ Erreur auto-update :",
      error.message
    );
  });

  autoUpdater.on("download-progress", (progress) => {
    console.log(
      `⬇️ Mise à jour : ${Math.round(
        progress.percent
      )}%`
    );
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log(
      `✅ Mise à jour téléchargée : ${info.version}`
    );

    console.log(
      "🔄 Redémarrage de GamerLink pour installer la mise à jour..."
    );

    autoUpdater.quitAndInstall();
  });

  autoUpdater.checkForUpdates();
}
  }
);

// ============================================================
// FERMETURE
// ============================================================

app.on(
  "window-all-closed",
  () => {
    if (
      detectionInterval
    ) {
      clearInterval(
        detectionInterval
      );

      detectionInterval =
        null;
    }

    if (
      process.platform !==
      "darwin"
    ) {
      app.quit();
    }
  }
);