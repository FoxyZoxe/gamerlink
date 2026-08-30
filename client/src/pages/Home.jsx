import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import Avatar from "../components/Avatar.jsx";
import { statusMeta } from "../lib/status.js";

export default function Home() {
  const { user } = useAuth();

  const [friends, setFriends] = useState([]);
  const [myGames, setMyGames] = useState([]);
  const [squads, setSquads] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const [
          friendsRes,
          gamesRes,
          squadsRes,
        ] = await Promise.all([
          api.getFriends(),
          api.getMyGames(),
          api.getSquads(),
        ]);

        if (!alive) return;

        setFriends(
          friendsRes.friends || []
        );

        setMyGames(
          gamesRes.userGames || []
        );

        setSquads(
          squadsRes.squads || []
        );

        setLoading(false);
      } catch (err) {
        console.error(
          "Erreur accueil :",
          err
        );

        if (alive) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  const sortedFriends = useMemo(() => {
    const rank = {
      in_game: 0,
      online: 1,
      afk: 2,
      dnd: 3,
      offline: 4,
      invisible: 4,
    };

    return [...friends].sort(
      (a, b) =>
        (rank[a.status] ?? 5) -
        (rank[b.status] ?? 5)
    );
  }, [friends]);

  const onlineFriends = sortedFriends.filter(
    (friend) =>
      friend.status !== "offline" &&
      friend.status !== "invisible"
  );

  const currentGame = myGames.find(
    (game) =>
      game.game_id === user?.current_game_id
  );

  const totalPlaytime = myGames.reduce(
    (total, game) =>
      total + (game.playtime_minutes || 0),
    0
  );

  const meta = statusMeta(
    user?.status
  );

  return (
    <div className="home-page">

      {/* ============================================================
          HERO
          ============================================================ */}

      <section className="home-hero glass-card">

        <div className="home-hero-glow" />

        <div className="home-hero-content">

          <div className="eyebrow">
            GAMERLINK DASHBOARD
          </div>

          <h1>
            Salut {user?.username} 👋
          </h1>

          <p>
            Prêt à trouver des joueurs
            pour ta prochaine partie ?
          </p>

          <div className="home-hero-actions">

            <Link
              to="/trouver"
              className="btn btn-primary"
            >
              🔎 Trouver des joueurs
            </Link>

            <Link
              to="/squads"
              className="btn btn-ghost"
            >
              🚀 Voir les squads
            </Link>

          </div>

        </div>

        {/* STATUT */}

        <div className="home-status-card">

          <div className="eyebrow">
            TON STATUT
          </div>

          <div
            className="home-status"
            style={{
              color: meta.color,
            }}
          >
            <span
              className="home-status-dot"
              style={{
                background:
                  meta.color,
              }}
            />

            {meta.label}
          </div>

          {user?.status === "in_game" &&
            user.custom_status && (
              <div className="home-current-status">
                🎮 {user.custom_status}
              </div>
            )}

        </div>

      </section>

      {/* ============================================================
          STATS
          ============================================================ */}

      <section className="home-stats">

        <div className="glass-card home-stat">

          <div className="home-stat-icon">
            👥
          </div>

          <div>
            <div className="home-stat-value">
              {friends.length}
            </div>

            <div className="eyebrow">
              AMIS
            </div>
          </div>

        </div>

        <div className="glass-card home-stat">

          <div className="home-stat-icon">
            🟢
          </div>

          <div>
            <div className="home-stat-value">
              {onlineFriends.length}
            </div>

            <div className="eyebrow">
              EN LIGNE
            </div>
          </div>

        </div>

        <div className="glass-card home-stat">

          <div className="home-stat-icon">
            🎮
          </div>

          <div>
            <div className="home-stat-value">
              {myGames.length}
            </div>

            <div className="eyebrow">
              JEUX
            </div>
          </div>

        </div>

        <div className="glass-card home-stat">

          <div className="home-stat-icon">
            ⏱️
          </div>

          <div>
            <div className="home-stat-value">
              {Math.round(
                totalPlaytime / 60
              )}
              h
            </div>

            <div className="eyebrow">
              TEMPS DE JEU
            </div>
          </div>

        </div>

      </section>

      {/* ============================================================
          AMIS + JEU ACTUEL
          ============================================================ */}

      <div className="home-grid">

        {/* AMIS */}

        <section className="section">

          <div className="section-title">

            <h2>
              👥 Tes amis
            </h2>

            <Link
              to="/amis"
              className="eyebrow"
            >
              Voir tout →
            </Link>

          </div>

          <div className="glass-card">

            {loading && (
              <div className="empty-state">
                Chargement...
              </div>
            )}

            {!loading &&
              sortedFriends.length === 0 && (
                <div className="empty-state">

                  <div className="glyph">
                    👥
                  </div>

                  Aucun ami pour
                  l'instant.

                  <br />

                  <Link
                    to="/trouver"
                    className="eyebrow"
                  >
                    Trouver des joueurs →
                  </Link>

                </div>
              )}

            {!loading &&
              sortedFriends
                .slice(0, 6)
                .map((friend, index) => {

                  const friendMeta =
                    statusMeta(
                      friend.status
                    );

                  return (
                    <Link
                      to={`/profil/${friend.id}`}
                      key={friend.id}
                      className="home-friend-row"
                      style={{
                        borderTop:
                          index > 0
                            ? "1px solid var(--panel-border)"
                            : "none",
                      }}
                    >

                      <Avatar
                        user={friend}
                        size={42}
                      />

                      <div className="meta">

                        <div className="name">
                          {friend.username}
                        </div>

                        <div
                          className="sub"
                          style={{
                            color:
                              friendMeta.color,
                          }}
                        >
                          <span
                            className="home-presence-dot"
                            style={{
                              background:
                                friendMeta.color,
                            }}
                          />

                          {friend.status ===
                            "in_game" &&
                          friend.custom_status
                            ? `🎮 ${friend.custom_status}`
                            : friendMeta.label}
                        </div>

                      </div>

                      <span className="home-row-arrow">
                        →
                      </span>

                    </Link>
                  );
                })}

          </div>

        </section>

        {/* JEU ACTUEL */}

        <section className="section">

          <div className="section-title">
            <h2>
              🎮 Jeu actuel
            </h2>

            <Link
              to="/jeux"
              className="eyebrow"
            >
              Ma bibliothèque →
            </Link>
          </div>

          <div className="glass-card home-current-game">

            {currentGame ? (
              <>
                <div className="eyebrow">
                  EN TRAIN DE JOUER
                </div>

                <div className="home-game-name">
                  {currentGame.game?.name ||
                    "Jeu inconnu"}
                </div>

                <div className="home-game-info">
                  {Math.round(
                    currentGame.playtime_minutes /
                      60
                  )}{" "}
                  heures jouées
                </div>

                <Link
                  to="/jeux"
                  className="btn btn-primary"
                  style={{
                    marginTop: 18,
                  }}
                >
                  🎮 Ouvrir mes jeux
                </Link>
              </>
            ) : (
              <>
                <div className="home-game-empty-icon">
                  🕹️
                </div>

                <div className="home-game-name">
                  Aucun jeu actif
                </div>

                <p>
                  Lance un jeu depuis
                  ta bibliothèque pour
                  afficher ton activité.
                </p>

                <Link
                  to="/jeux"
                  className="btn btn-ghost"
                  style={{
                    marginTop: 12,
                  }}
                >
                  Voir mes jeux →
                </Link>
              </>
            )}

          </div>

        </section>

      </div>

      {/* ============================================================
          SQUADS
          ============================================================ */}

      <section className="section">

        <div className="section-title">

          <h2>
            🚀 Squads disponibles
          </h2>

          <Link
            to="/squads"
            className="eyebrow"
          >
            Voir toutes →
          </Link>

        </div>

        <div className="grid grid-2">

          {!loading &&
            squads.length === 0 && (
              <div
                className="glass-card empty-state"
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              >
                <div className="glyph">
                  🚀
                </div>

                Aucune squad disponible.

                <br />

                <Link
                  to="/squads"
                  className="eyebrow"
                >
                  Créer une squad →
                </Link>
              </div>
            )}

          {squads
            .filter(
              (squad) =>
                squad.memberCount < 8
            )
            .slice(0, 4)
            .map((squad) => (
              <Link
                to="/squads"
                key={squad.id}
                className="glass-card home-squad-card"
              >

                <div className="home-squad-top">

                  <div>

                    <div className="eyebrow">
                      🎮{" "}
                      {squad.game?.name ||
                        "Jeu inconnu"}
                    </div>

                    <h3>
                      {squad.name}
                    </h3>

                  </div>

                  <span className="squad-count">
                    {squad.memberCount}/8
                  </span>

                </div>

                <p>
                  {squad.description ||
                    "Aucune description."}
                </p>

                <div className="home-squad-bottom">

                  <div className="squad-members">

                    {squad.members
                      ?.slice(0, 5)
                      .map((member) => (
                        <Avatar
                          key={member.id}
                          user={member}
                          size={28}
                        />
                      ))}

                  </div>

                  <span className="eyebrow">
                    Rejoindre →
                  </span>

                </div>

              </Link>
            ))}

        </div>

      </section>

      {/* ============================================================
          JEUX RÉCENTS
          ============================================================ */}

      <section className="section">

        <div className="section-title">

          <h2>
            🕹️ Jeux récents
          </h2>

          <Link
            to="/jeux"
            className="eyebrow"
          >
            Voir tout →
          </Link>

        </div>

        <div className="grid grid-2">

          {myGames.length === 0 && (
            <div
              className="glass-card empty-state"
              style={{
                gridColumn:
                  "1 / -1",
              }}
            >
              <div className="glyph">
                🎮
              </div>

              Aucun jeu dans ta
              bibliothèque.

              <br />

              <Link
                to="/jeux"
                className="eyebrow"
              >
                Ajouter un jeu →
              </Link>
            </div>
          )}

          {myGames
            .slice(0, 4)
            .map((game) => (
              <Link
                to="/jeux"
                className={`glass-card home-game-card ${
                  user?.current_game_id ===
                  game.game_id
                    ? "game-active"
                    : ""
                }`}
                key={game.game_id}
              >

                <div className="home-game-card-icon">
                  🎮
                </div>

                <div>

                  <div className="home-game-card-name">
                    {game.game?.name ||
                      "Jeu inconnu"}
                  </div>

                  <div className="eyebrow font-mono">
                    {Math.round(
                      game.playtime_minutes /
                        60
                    )}{" "}
                    h jouées
                  </div>

                </div>

                {user?.current_game_id ===
                  game.game_id && (
                  <span className="home-playing">
                    EN JEU
                  </span>
                )}

              </Link>
            ))}

        </div>

      </section>

    </div>
  );
}