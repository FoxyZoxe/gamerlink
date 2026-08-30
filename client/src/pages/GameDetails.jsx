import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function GameDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const {
    currentGame,
  } = useAuth();

  const [game, setGame] = useState(null);
  const [userGame, setUserGame] = useState(null);
  const [friends, setFriends] = useState([]);

  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [playtime, setPlaytime] = useState(0);

  // ==========================================================
  // CHARGEMENT
  // ==========================================================

  async function load() {
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

      const catalog =
        catalogRes?.games || [];

      const myGames =
        mineRes?.userGames || [];

      const friendList =
        friendsRes?.friends || [];

      const selectedGame =
        catalog.find(
          (item) =>
            String(item.id) ===
            String(id)
        );

      const selectedUserGame =
        myGames.find(
          (item) =>
            String(item.game_id) ===
            String(id)
        );

      setGame(
        selectedGame || null
      );

      setUserGame(
        selectedUserGame || null
      );

      setFriends(
        friendList
      );

      console.log(
        "🎮 GameDetails :",
        selectedGame
      );

    } catch (error) {
      console.error(
        "❌ Erreur GameDetails :",
        error
      );

      showToast(
        `⚠ ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  // ==========================================================
  // JEU ACTUEL
  // ==========================================================

  const isCurrent =
    String(currentGame?.id || "") ===
    String(id);

  // ==========================================================
  // COMPTEUR
  // ==========================================================

  useEffect(() => {
    function handlePlaytimeUpdated(
      event
    ) {
      const seconds =
        Number(
          event?.detail?.seconds || 0
        );

      setPlaytime(seconds);
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
  // DÉTECTION DU JEU
  // ==========================================================

  useEffect(() => {
    function handleGameUpdated(
      event
    ) {
      const detectedGame =
        event?.detail?.game || null;

      console.log(
        "🎮 GameDetails reçoit :",
        detectedGame
      );

      load();

      if (!detectedGame) {
        setPlaytime(0);
      }
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
  }, [id]);

  // ==========================================================
  // AMIS SUR CE JEU
  // ==========================================================

  const playingFriends =
    useMemo(() => {
      if (!game) {
        return [];
      }

      return friends.filter(
        (friend) => {
          const sameGame =
            String(
              friend.current_game_id || ""
            ) ===
            String(id);

          const statusGame =
            friend.status ===
              "in_game" &&
            String(
              friend.custom_status || ""
            )
              .toLowerCase()
              .trim() ===
            String(game.name)
              .toLowerCase()
              .trim();

          return (
            sameGame ||
            statusGame
          );
        }
      );
    }, [
      friends,
      game,
      id,
    ]);

  // ==========================================================
  // TEMPS DE JEU
  // ==========================================================

  const playtimeMinutes =
    Number(
      userGame?.playtime_minutes || 0
    );

  function formatHours(minutes) {
    const total =
      Math.max(
        0,
        Math.floor(
          Number(minutes) || 0
        )
      );

    const hours =
      Math.floor(total / 60);

    const mins =
      total % 60;

    if (hours === 0) {
      return `${mins} min`;
    }

    if (mins === 0) {
      return `${hours} h`;
    }

    return `${hours} h ${String(
      mins
    ).padStart(2, "0")} min`;
  }

  function formatPlaytime(seconds) {
    const total =
      Math.max(
        0,
        Math.floor(
          Number(seconds) || 0
        )
      );

    const hours =
      Math.floor(total / 3600);

    const minutes =
      Math.floor(
        (total % 3600) / 60
      );

    const secs =
      total % 60;

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
  // DATE
  // ==========================================================

  function formatDate(date) {
    if (!date) {
      return "Aucune session enregistrée";
    }

    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return "Date inconnue";
    }

    return parsed.toLocaleDateString(
      "fr-FR",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  }

  // ==========================================================
  // LANCER
  // ==========================================================

  async function launchGame() {
    if (!game) {
      return;
    }

    if (
      !window.gamerlinkDesktop?.launchGame
    ) {
      showToast(
        "⚠ GamerLink Desktop indisponible."
      );

      return;
    }

    if (isCurrent) {
      showToast(
        `🟢 ${game.name} est déjà lancé.`
      );

      return;
    }

    try {
      setLaunching(true);

      console.log(
        "🚀 Lancement :",
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
      setLaunching(false);
    }
  }

  // ==========================================================
  // CHARGEMENT
  // ==========================================================

  if (loading) {
    return (
      <div className="games-page">

        <div className="glass-card empty-state">

          <div className="glyph">
            ⏳
          </div>

          <h3>
            Chargement...
          </h3>

          <p>
            Chargement de la fiche du jeu.
          </p>

        </div>

      </div>
    );
  }

  // ==========================================================
  // JEU INTROUVABLE
  // ==========================================================

  if (!game) {
    return (
      <div className="games-page">

        <div className="glass-card empty-state">

          <div className="glyph">
            🎮
          </div>

          <h3>
            Jeu introuvable
          </h3>

          <p>
            Aucun jeu correspondant à cet identifiant.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              navigate("/jeux")
            }
          >
            ← Retour aux jeux
          </button>

        </div>

      </div>
    );
  }

  // ==========================================================
  // INTERFACE
  // ==========================================================

  return (
    <div className="games-page">

      {/* ======================================================
          RETOUR
      ====================================================== */}

      <button
        type="button"
        className="btn btn-ghost"
        onClick={() =>
          navigate("/jeux")
        }
        style={{
          marginBottom: "20px",
        }}
      >
        ← Retour à mes jeux
      </button>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <section className="glass-card current-game-card">

        <div className="current-game-content">

          <div
            className="current-game-icon"
            style={{
              fontSize: "3rem",
            }}
          >
            🎮
          </div>

          <div className="current-game-info">

            <div className="eyebrow">
              GAMERLINK GAME PROFILE
            </div>

            <h1>
              {game.name}
            </h1>

            <p>
              Toutes tes statistiques
              et ton activité sur ce jeu.
            </p>

            {isCurrent && (
              <div
                style={{
                  marginTop: "12px",
                  color: "#55ff88",
                  fontFamily:
                    "var(--font-mono)",
                  fontWeight: "700",
                  fontSize: "0.8rem",
                }}
              >
                🟢 EN LIGNE SUR{" "}
                {game.name.toUpperCase()}

                <br />

                <span
                  style={{
                    opacity: 0.8,
                  }}
                >
                  ⏱️{" "}
                  {formatPlaytime(
                    playtime
                  )}
                </span>
              </div>
            )}

          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={launchGame}
            disabled={
              launching ||
              isCurrent
            }
          >
            {launching
              ? "🚀 Lancement..."
              : isCurrent
              ? "🟢 En jeu"
              : "▶ Lancer le jeu"}
          </button>

        </div>

      </section>

      {/* ======================================================
          STATS
      ====================================================== */}

      <section className="games-stats">

        <div className="glass-card game-stat">

          <span className="game-stat-icon">
            ⏱️
          </span>

          <div>

            <strong>
              {formatHours(
                playtimeMinutes
              )}
            </strong>

            <span>
              Temps de jeu total
            </span>

          </div>

        </div>

        <div className="glass-card game-stat">

          <span className="game-stat-icon">
            {isCurrent
              ? "🟢"
              : "⚫"}
          </span>

          <div>

            <strong>
              {isCurrent
                ? "En ligne"
                : "Hors ligne"}
            </strong>

            <span>
              Statut actuel
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
              Amis sur ce jeu
            </span>

          </div>

        </div>

      </section>

      {/* ======================================================
          ACTIVITÉ
      ====================================================== */}

      <section className="section">

        <div className="section-title">

          <div>

            <div className="eyebrow">
              ACTIVITÉ
            </div>

            <h2>
              Ton activité
            </h2>

          </div>

        </div>

        <div className="glass-card">

          <div
            style={{
              display: "grid",
              gap: "20px",
              padding: "10px",
            }}
          >

            <div>

              <div className="eyebrow">
                TEMPS TOTAL
              </div>

              <h2>
                {formatHours(
                  playtimeMinutes
                )}
              </h2>

            </div>

            <div>

              <div className="eyebrow">
                DERNIÈRE ACTIVITÉ
              </div>

              <p>
                {formatDate(
                  userGame?.updated_at ||
                  userGame?.last_played_at
                )}
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* ======================================================
          AMIS
      ====================================================== */}

      <section className="section">

        <div className="section-title">

          <div>

            <div className="eyebrow">
              COMMUNAUTÉ
            </div>

            <h2>
              Tes amis sur{" "}
              {game.name}
            </h2>

          </div>

          <span className="eyebrow">
            {playingFriends.length} en jeu
          </span>

        </div>

        {playingFriends.length === 0 ? (

          <div className="glass-card empty-state">

            <div className="glyph">
              👥
            </div>

            <h3>
              Aucun ami en jeu
            </h3>

            <p>
              Aucun de tes amis ne joue
              actuellement à {game.name}.
            </p>

          </div>

        ) : (

          <div className="friends-playing-list glass-card">

            {playingFriends.map(
              (friend) => (
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
                      🎮 {game.name}
                    </span>

                  </div>

                  <span className="playing-dot">
                    ● EN JEU
                  </span>

                </div>
              )
            )}

          </div>

        )}

      </section>

    </div>
  );
}