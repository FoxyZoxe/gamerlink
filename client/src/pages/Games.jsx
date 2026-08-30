import {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

import { useNavigate } from "react-router-dom";

import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Games() {
  const navigate = useNavigate();
  const showToast = useToast();

  const {
    user,
    currentGame,
  } = useAuth();

  // ==========================================================
  // ÉTATS
  // ==========================================================

  const [catalog, setCatalog] = useState([]);
  const [myGames, setMyGames] = useState([]);
  const [friends, setFriends] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const [currentPlaytime, setCurrentPlaytime] = useState(0);

  // ==========================================================
  // CHARGEMENT DES DONNÉES
  // ==========================================================

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [
        catalogRes,
        mineRes,
        friendsRes,
      ] = await Promise.all([
        api.getGamesCatalog(),
        api.getMyGames(),
        api.getFriends(),
      ]);

      setCatalog(
        catalogRes?.games || []
      );

      setMyGames(
        mineRes?.userGames || []
      );

      setFriends(
        friendsRes?.friends || []
      );

      console.log("✅ Jeux chargés");
    } catch (error) {
      console.error(
        "❌ Erreur chargement Jeux :",
        error
      );

      showToast(
        `⚠ ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // ==========================================================
  // PREMIER CHARGEMENT
  // ==========================================================

  useEffect(() => {
    load();
  }, [load]);

  // ==========================================================
  // JEU DÉTECTÉ / ARRÊTÉ
  // ==========================================================

  useEffect(() => {
    function handleGameUpdated(event) {
      const detectedGame =
        event?.detail?.game || null;

      console.log(
        "🎮 Games.jsx reçoit :",
        detectedGame?.name || "aucun jeu"
      );

      if (!detectedGame) {
        setCurrentPlaytime(0);
      }

      // IMPORTANT :
      // On recharge seulement les jeux/friends.
      // On NE fait PAS refreshUser() ici.
      //
      // currentGame vient directement du AuthContext.
      load();
    }

    window.addEventListener(
      "gamerlink-game-updated",
      handleGameUpdated
    );

    return () => {
      window.removeEventListener(
        "gamerlink-game-updated",
        handleGameUpdated
      );
    };
  }, [load]);

  // ==========================================================
  // COMPTEUR DE TEMPS
  // ==========================================================

  useEffect(() => {
    function handlePlaytimeUpdated(event) {
      const seconds = Number(
        event?.detail?.seconds || 0
      );

      setCurrentPlaytime(seconds);
    }

    window.addEventListener(
      "gamerlink-playtime-updated",
      handlePlaytimeUpdated
    );

    return () => {
      window.removeEventListener(
        "gamerlink-playtime-updated",
        handlePlaytimeUpdated
      );
    };
  }, []);

  // ==========================================================
  // LOG DEBUG JEU ACTUEL
  // ==========================================================

  useEffect(() => {
    console.log(
      "🎮 Games.jsx currentGame :",
      currentGame?.name || "aucun jeu"
    );
  }, [currentGame]);

  // ==========================================================
  // FORMAT COMPTEUR
  // ==========================================================

  function formatPlaytime(seconds) {
    const totalSeconds = Math.max(
      0,
      Math.floor(Number(seconds) || 0)
    );

    const hours = Math.floor(
      totalSeconds / 3600
    );

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );

    const secs =
      totalSeconds % 60;

    return `${String(hours).padStart(
      2,
      "0"
    )}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(
      2,
      "0"
    )}`;
  }

  // ==========================================================
  // FORMAT HEURES
  // ==========================================================

  function formatHours(minutes) {
    const totalMinutes = Math.max(
      0,
      Math.floor(Number(minutes) || 0)
    );

    const hours = Math.floor(
      totalMinutes / 60
    );

    const remainingMinutes =
      totalMinutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} min`;
    }

    if (remainingMinutes === 0) {
      return `${hours} h`;
    }

    return `${hours} h ${String(
      remainingMinutes
    ).padStart(2, "0")} min`;
  }

  // ==========================================================
  // JEUX POSSÉDÉS
  // ==========================================================

  const ownedIds = useMemo(
    () =>
      new Set(
        myGames.map(
          (game) =>
            String(game.game_id)
        )
      ),
    [myGames]
  );

  // ==========================================================
  // TEMPS TOTAL
  // ==========================================================

  const totalMinutes = useMemo(
    () =>
      myGames.reduce(
        (sum, game) =>
          sum +
          Number(
            game.playtime_minutes || 0
          ),
        0
      ),
    [myGames]
  );

  // ==========================================================
  // RECHERCHE
  // ==========================================================

  const filteredCatalog = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return catalog;
    }

    return catalog.filter(
      (game) =>
        game.name
          ?.toLowerCase()
          .includes(query)
    );
  }, [catalog, search]);

  // ==========================================================
  // AMIS EN JEU
  // ==========================================================

  const playingFriends = useMemo(
    () =>
      friends.filter(
        (friend) =>
          friend.status === "in_game" ||
          Boolean(friend.current_game_id)
      ),
    [friends]
  );

  // ==========================================================
  // ARRÊTER LE JEU
  // ==========================================================

  async function stopCurrentGame() {
    try {
      setActionLoading("stop");

      await api.setCurrentGame(null);

      setCurrentPlaytime(0);

      await load();

      showToast(
        "✓ Tu as arrêté de jouer"
      );
    } catch (error) {
      console.error(
        "❌ Erreur arrêt du jeu :",
        error
      );

      showToast(
        `⚠ ${error.message}`
      );
    } finally {
      setActionLoading(null);
    }
  }

  // ==========================================================
  // LANCER UN JEU
  // ==========================================================

  async function launchGame(game) {
    try {
      if (!game) {
        throw new Error(
          "Jeu introuvable."
        );
      }

      if (
        !window.gamerlinkDesktop?.launchGame
      ) {
        throw new Error(
          "Le système de lancement GamerLink n'est pas disponible."
        );
      }

      setActionLoading(game.id);

      console.log(
        "🚀 Lancement demandé :",
        game
      );

      const result =
        await window.gamerlinkDesktop.launchGame(
          game
        );

      if (
        result &&
        result.success === false
      ) {
        throw new Error(
          result.error ||
            "Impossible de lancer le jeu."
        );
      }

      showToast(
        `🚀 Lancement de ${game.name}...`
      );
    } catch (error) {
      console.error(
        "❌ Erreur lancement :",
        error
      );

      showToast(
        `⚠ ${error.message}`
      );
    } finally {
      setActionLoading(null);
    }
  }

  // ==========================================================
  // AJOUTER UN JEU
  // ==========================================================

  async function addGame(gameId) {
    try {
      const loadingId =
        `add-${gameId}`;

      setActionLoading(loadingId);

      await api.addGameToLibrary(
        gameId
      );

      showToast(
        "✓ Jeu ajouté à ta bibliothèque"
      );

      await load();
    } catch (error) {
      console.error(
        "❌ Erreur ajout jeu :",
        error
      );

      showToast(
        `⚠ ${error.message}`
      );
    } finally {
      setActionLoading(null);
    }
  }

  // ==========================================================
  // OUVRIR DÉTAILS
  // ==========================================================

  function openGameDetails(gameId) {
    navigate(
      `/jeux/${gameId}`
    );
  }

  // ==========================================================
  // INTERFACE
  // ==========================================================

  return (
    <div className="games-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="page-header games-header">

        <div>
          <div className="eyebrow">
            GAMERLINK GAME HUB
          </div>

          <h1>
            🎮 Mes jeux
          </h1>

          <p>
            Ta bibliothèque, ton activité
            et tes prochaines parties.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={load}
          disabled={loading}
        >
          ↻ Actualiser
        </button>

      </div>

      {/* ======================================================
          JEU ACTUEL
      ====================================================== */}

      {currentGame && (
        <section className="current-game-card glass-card">

          <div className="current-game-content">

            <div className="current-game-icon">
              🎮
            </div>

            <div className="current-game-info">

              <div className="eyebrow">
                🟢 ACTUELLEMENT EN JEU
              </div>

              <h2>
                {currentGame.name}
              </h2>

              <p>
                Tu joues actuellement
                à {currentGame.name}.
              </p>

              <div
                style={{
                  marginTop: "12px",
                  fontFamily:
                    "var(--font-mono)",
                  fontSize:
                    "0.85rem",
                  fontWeight: "700",
                  color:
                    "#55ff88",
                }}
              >
                🟢 EN LIGNE SUR{" "}
                {currentGame.name.toUpperCase()}
                <br />

                <span
                  style={{
                    opacity: 0.8,
                    fontSize: "0.75rem",
                  }}
                >
                  ⏱️{" "}
                  {formatPlaytime(
                    currentPlaytime
                  )}
                </span>
              </div>

            </div>

            <button
              type="button"
              className="btn btn-ghost"
              disabled={
                actionLoading ===
                "stop"
              }
              onClick={
                stopCurrentGame
              }
            >
              {actionLoading === "stop"
                ? "Arrêt..."
                : "⏹ Arrêter"}
            </button>

          </div>

        </section>
      )}

      {/* ======================================================
          STATS
      ====================================================== */}

      <section className="games-stats">

        <div className="glass-card game-stat">

          <span className="game-stat-icon">
            🎮
          </span>

          <div>
            <strong>
              {myGames.length}
            </strong>

            <span>
              Jeux dans ma bibliothèque
            </span>
          </div>

        </div>

        <div className="glass-card game-stat">

          <span className="game-stat-icon">
            ⏱️
          </span>

          <div>
            <strong>
              {formatHours(
                totalMinutes
              )}
            </strong>

            <span>
              Temps de jeu total
            </span>
          </div>

        </div>

        <div className="glass-card game-stat">

          <span className="game-stat-icon">
            👥
          </span>

          <div>
            <strong>
              {playingFriends.length}
            </strong>

            <span>
              Amis actuellement en jeu
            </span>
          </div>

        </div>

      </section>

      {/* ======================================================
          AMIS EN JEU
      ====================================================== */}

      {playingFriends.length > 0 && (
        <section className="section">

          <div className="section-title">

            <div>
              <div className="eyebrow">
                ACTIVITÉ
              </div>

              <h2>
                Tes amis jouent
              </h2>
            </div>

            <span className="eyebrow">
              {playingFriends.length} en jeu
            </span>

          </div>

          <div className="friends-playing-list glass-card">

            {playingFriends.map(
              (friend) => {

                const friendGame =
                  catalog.find(
                    (game) =>
                      String(game.id) ===
                      String(
                        friend.current_game_id
                      )
                  );

                return (
                  <div
                    className="friend-playing-row"
                    key={friend.id}
                  >

                    <div className="friend-playing-avatar">
                      {(friend.username || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="friend-playing-info">

                      <strong>
                        {friend.username}
                      </strong>

                      <span>
                        🎮{" "}
                        {friendGame?.name ||
                          friend.custom_status ||
                          "En jeu"}
                      </span>

                    </div>

                    <span className="playing-dot">
                      ● EN JEU
                    </span>

                  </div>
                );
              }
            )}

          </div>

        </section>
      )}

      {/* ======================================================
          MA BIBLIOTHÈQUE
      ====================================================== */}

      <section className="section">

        <div className="section-title">

          <div>
            <div className="eyebrow">
              TA COLLECTION
            </div>

            <h2>
              Ma bibliothèque
            </h2>
          </div>

          <span className="eyebrow">
            {myGames.length} jeu
            {myGames.length > 1
              ? "x"
              : ""}
          </span>

        </div>

        {loading ? (

          <div className="glass-card empty-state">

            <div className="glyph">
              ⏳
            </div>

            Chargement de ta bibliothèque...

          </div>

        ) : myGames.length === 0 ? (

          <div className="glass-card empty-state">

            <div className="glyph">
              🕹️
            </div>

            <h3>
              Ta bibliothèque est vide
            </h3>

            <p>
              Ajoute des jeux depuis
              le catalogue ci-dessous.
            </p>

          </div>

        ) : (

          <div className="games-library-grid">

            {myGames.map(
              (userGame) => {

                /*
                 * IMPORTANT
                 *
                 * On compare directement
                 * avec currentGame venant
                 * du AuthContext.
                 */

                const isCurrent =
                  String(
                    currentGame?.id || ""
                  ) ===
                  String(
                    userGame.game_id
                  );

                const gameName =
                  userGame.game?.name ||
                  catalog.find(
                    (game) =>
                      String(game.id) ===
                      String(
                        userGame.game_id
                      )
                  )?.name ||
                  "Jeu inconnu";

                return (

                  <div
                    className={
                      isCurrent
                        ? "glass-card game-library-card game-active"
                        : "glass-card game-library-card"
                    }
                    key={
                      userGame.game_id
                    }
                  >

                    {/* ICÔNE */}

                    <div className="game-card-icon">
                      🎮
                    </div>

                    <div className="game-card-content">

                      {/* ==================================================
                          TITRE + STATUT
                      ================================================== */}

                      <div className="game-card-top">

                        <div>

                          <h3>
                            {gameName}
                          </h3>

                          <div className="eyebrow font-mono">
                            {formatHours(
                              userGame.playtime_minutes
                            )}{" "}
                            de jeu
                          </div>

                          {/* JEU ACTUEL */}

                          {isCurrent && (
                            <div
                              className="game-current-playtime"
                              style={{
                                marginTop:
                                  "10px",
                                color:
                                  "#55ff88",
                                fontSize:
                                  "0.75rem",
                                fontWeight:
                                  "700",
                                fontFamily:
                                  "var(--font-mono)",
                                lineHeight:
                                  "1.6",
                              }}
                            >
                              🟢 EN LIGNE SUR{" "}
                              {gameName.toUpperCase()}

                              <br />

                              <span
                                style={{
                                  opacity:
                                    0.8,
                                  fontSize:
                                    "0.7rem",
                                }}
                              >
                                ⏱️{" "}
                                {formatPlaytime(
                                  currentPlaytime
                                )}
                              </span>
                            </div>
                          )}

                        </div>

                        {/* BADGE */}

                        {isCurrent ? (

                          <div
                            className="game-playing-badge"
                            style={{
                              display:
                                "flex",
                              flexDirection:
                                "column",
                              alignItems:
                                "flex-end",
                              gap: "4px",
                            }}
                          >

                            <span>
                              🟢 EN LIGNE
                            </span>

                            <small
                              style={{
                                fontSize:
                                  "0.65rem",
                                opacity:
                                  0.7,
                              }}
                            >
                              🎮 {gameName}
                            </small>

                          </div>

                        ) : (

                          <span
                            style={{
                              fontSize:
                                "0.7rem",
                              opacity:
                                0.45,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            ⚫ Hors ligne
                          </span>

                        )}

                      </div>

                      {/* ==================================================
                          BOUTONS
                      ================================================== */}

                      <div className="game-card-actions">

                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() =>
                            openGameDetails(
                              userGame.game_id
                            )
                          }
                        >
                          📊 Détails
                        </button>

                        {isCurrent ? (

                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={
                              actionLoading ===
                              "stop"
                            }
                            onClick={
                              stopCurrentGame
                            }
                          >
                            {actionLoading ===
                            "stop"
                              ? "Arrêt..."
                              : "⏹ Arrêter"}
                          </button>

                        ) : (

                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={
                              actionLoading ===
                              userGame.game_id
                            }
                            onClick={() =>
                              launchGame(
                                userGame.game
                              )
                            }
                          >
                            {actionLoading ===
                            userGame.game_id
                              ? "Lancement..."
                              : "▶ Jouer"}
                          </button>

                        )}

                      </div>

                    </div>

                  </div>

                );
              }
            )}

          </div>

        )}

      </section>

      {/* ======================================================
          CATALOGUE
      ====================================================== */}

      <section className="section">

        <div className="section-title">

          <div>

            <div className="eyebrow">
              GAMERLINK
            </div>

            <h2>
              Catalogue de jeux
            </h2>

          </div>

          <span className="eyebrow">
            {filteredCatalog.length} résultat
            {filteredCatalog.length > 1
              ? "s"
              : ""}
          </span>

        </div>

        {/* RECHERCHE */}

        <div className="games-catalog-toolbar glass-card">

          <div className="field">

            <label>
              Rechercher un jeu
            </label>

            <input
              type="search"
              placeholder="Minecraft, Fortnite, Valheim..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

          </div>

        </div>

        {/* RÉSULTATS */}

        {filteredCatalog.length === 0 ? (

          <div className="glass-card empty-state">

            <div className="glyph">
              🔎
            </div>

            <h3>
              Aucun jeu trouvé
            </h3>

            <p>
              Essaie une autre recherche.
            </p>

          </div>

        ) : (

          <div className="catalog-list glass-card">

            {filteredCatalog.map(
              (game) => {

                const owned =
                  ownedIds.has(
                    String(game.id)
                  );

                const isPlaying =
                  String(
                    currentGame?.id || ""
                  ) ===
                  String(game.id);

                return (

                  <div
                    className={
                      isPlaying
                        ? "catalog-game-row game-active"
                        : "catalog-game-row"
                    }
                    key={game.id}
                  >

                    <div className="catalog-game-icon">
                      🎮
                    </div>

                    <div className="catalog-game-info">

                      <strong>
                        {game.name}
                      </strong>

                      {isPlaying && (
                        <span
                          style={{
                            color:
                              "#55ff88",
                            fontWeight:
                              "700",
                          }}
                        >
                          🟢 EN LIGNE
                        </span>
                      )}

                      {!isPlaying &&
                        owned && (
                          <span>
                            ✓ Dans ta bibliothèque
                          </span>
                        )}

                    </div>

                    {owned ? (

                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: "10px",
                        }}
                      >

                        {isPlaying && (
                          <span
                            className="eyebrow"
                            style={{
                              color:
                                "#55ff88",
                            }}
                          >
                            EN JEU
                          </span>
                        )}

                        <span className="eyebrow">
                          ✓ Possédé
                        </span>

                      </div>

                    ) : (

                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={
                          actionLoading ===
                          `add-${game.id}`
                        }
                        onClick={() =>
                          addGame(
                            game.id
                          )
                        }
                      >
                        {actionLoading ===
                        `add-${game.id}`
                          ? "..."
                          : "+ Ajouter"}
                      </button>

                    )}

                  </div>

                );
              }
            )}

          </div>

        )}

      </section>

    </div>
  );
}