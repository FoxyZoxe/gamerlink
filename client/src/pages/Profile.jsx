import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../lib/api.js";
import Avatar from "../components/Avatar.jsx";
import { statusMeta } from "../lib/status.js";

export default function Profile() {
  const { user, setUser } = useAuth();
  const showToast = useToast();

  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(
    user?.description || ""
  );
  const [favoriteGames, setFavoriteGames] = useState(
    (user?.favorite_games || []).join(", ")
  );

  const [stats, setStats] = useState({
    friendsCount: 0,
    playtimeMinutes: 0,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    setDescription(user.description || "");
    setFavoriteGames(
      (user.favorite_games || []).join(", ")
    );

    api.getProfile(user.id)
      .then((result) => {
        setStats(result);
      })
      .catch((err) => {
        console.error(
          "Erreur chargement profil :",
          err
        );
      });
  }, [user?.id]);

  if (!user) return null;

  const meta = statusMeta(user.status);

  const isPlaying =
    user.status === "in_game";

  async function save() {
    try {
      setSaving(true);

      const favorite_games = favoriteGames
        .split(",")
        .map((game) => game.trim())
        .filter(Boolean)
        .slice(0, 10);

      const result =
        await api.updateProfile({
          description: description.trim(),
          favorite_games,
        });

      setUser(result.user);
      setEditing(false);

      showToast(
        "✓ Profil mis à jour"
      );
    } catch (err) {
      showToast(
        `⚠ ${err.message}`
      );
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setDescription(
      user.description || ""
    );

    setFavoriteGames(
      (user.favorite_games || []).join(", ")
    );

    setEditing(false);
  }

  return (
    <div className="profile-page">

      {/* HEADER */}
      <div className="page-header profile-page-header">
        <div>
          <div className="eyebrow">
            GAMERLINK PROFILE
          </div>

          <h1>👤 Mon profil</h1>

          <p>
            Ton identité de joueur sur GamerLink.
          </p>
        </div>
      </div>

      {/* PROFIL HERO */}
      <section className="profile-hero glass-card">

        <div className="profile-hero-glow" />

        <div className="profile-avatar">
          <Avatar
            user={user}
            size={110}
          />
        </div>

        <div className="profile-identity">

          <div className="profile-name-row">
            <h2>
              {user.username}
            </h2>

            <span
              className="profile-status"
              style={{
                "--status-color": meta.color,
              }}
            >
              <span />
              {meta.label}
            </span>
          </div>

          <div className="profile-handle">
            @{user.username}
          </div>

          {isPlaying && (
            <div className="profile-current-game">
              🎮
              <span>
                En train de jouer
              </span>

              {user.custom_status && (
                <strong>
                  {user.custom_status}
                </strong>
              )}
            </div>
          )}

          {!isPlaying &&
            user.custom_status && (
              <div className="profile-custom-status">
                {user.custom_status}
              </div>
            )}
        </div>

        <button
          className="btn btn-primary profile-edit-button"
          onClick={() =>
            setEditing((value) => !value)
          }
        >
          {editing
            ? "Fermer"
            : "✏ Modifier"}
        </button>
      </section>

      {/* STATS */}
      <section className="profile-stats">

        <div className="glass-card profile-stat-card">
          <div className="profile-stat-icon">
            👥
          </div>

          <div>
            <strong>
              {stats.friendsCount}
            </strong>

            <span>
              Amis
            </span>
          </div>
        </div>

        <div className="glass-card profile-stat-card">
          <div className="profile-stat-icon">
            ⏱️
          </div>

          <div>
            <strong>
              {Math.round(
                stats.playtimeMinutes / 60
              )}{" "}
              h
            </strong>

            <span>
              Temps de jeu
            </span>
          </div>
        </div>

        <div className="glass-card profile-stat-card">
          <div className="profile-stat-icon">
            🎮
          </div>

          <div>
            <strong>
              {(user.favorite_games || [])
                .length}
            </strong>

            <span>
              Jeux favoris
            </span>
          </div>
        </div>

        <div className="glass-card profile-stat-card">
          <div className="profile-stat-icon">
            🟢
          </div>

          <div>
            <strong>
              {isPlaying
                ? "EN JEU"
                : "DISPONIBLE"}
            </strong>

            <span>
              Activité
            </span>
          </div>
        </div>

      </section>

      <div className="profile-layout">

        {/* COLONNE PRINCIPALE */}
        <main>

          {/* BIO */}
          <section className="glass-card profile-section">

            <div className="section-title">
              <h2>
                📝 À propos de moi
              </h2>
            </div>

            {editing ? (
              <div className="profile-edit-area">
                <textarea
                  rows={5}
                  maxLength={500}
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Présente-toi aux autres joueurs..."
                />

                <div className="profile-character-count">
                  {description.length}/500
                </div>
              </div>
            ) : (
              <p
                className={
                  user.description
                    ? "profile-description"
                    : "profile-description empty"
                }
              >
                {user.description ||
                  "Aucune description pour l'instant. Présente-toi aux autres joueurs !"}
              </p>
            )}

          </section>

          {/* JEUX FAVORIS */}
          <section className="glass-card profile-section">

            <div className="section-title">
              <h2>
                🎮 Jeux favoris
              </h2>

              <span className="eyebrow">
                {(user.favorite_games || [])
                  .length}/10
              </span>
            </div>

            {editing ? (
              <>
                <input
                  className="profile-games-input"
                  value={favoriteGames}
                  onChange={(event) =>
                    setFavoriteGames(
                      event.target.value
                    )
                  }
                  placeholder="Minecraft, ARK, GTA V..."
                />

                <div className="profile-input-help">
                  Sépare les jeux avec une virgule.
                </div>
              </>
            ) : (
              <div className="profile-game-tags">

                {(user.favorite_games || [])
                  .length === 0 && (
                  <span className="profile-empty-tag">
                    Aucun jeu favori
                  </span>
                )}

                {(user.favorite_games || [])
                  .map((game) => (
                    <span
                      className="profile-game-tag"
                      key={game}
                    >
                      🎮 {game}
                    </span>
                  ))}
              </div>
            )}

          </section>

          {/* ACTIVITÉ */}
          <section className="glass-card profile-section">

            <div className="section-title">
              <h2>
                ⚡ Activité
              </h2>
            </div>

            <div className="profile-activity">

              <div className="activity-icon">
                {isPlaying
                  ? "🎮"
                  : "🟢"}
              </div>

              <div>
                <strong>
                  {isPlaying
                    ? "Actuellement en jeu"
                    : "Aucun jeu actif"}
                </strong>

                <span>
                  {isPlaying
                    ? user.custom_status ||
                      "Un jeu est actuellement lancé."
                    : "Lance un jeu depuis ta bibliothèque pour apparaître comme joueur actif."}
                </span>
              </div>

            </div>

          </section>

        </main>

        {/* COLONNE DROITE */}
        <aside>

          <section className="glass-card profile-side-card">

            <div className="eyebrow">
              IDENTITÉ
            </div>

            <div className="profile-side-row">
              <span>
                Pseudo
              </span>

              <strong>
                {user.username}
              </strong>
            </div>

            <div className="profile-side-row">
              <span>
                Statut
              </span>

              <strong
                style={{
                  color: meta.color,
                }}
              >
                {meta.label}
              </strong>
            </div>

            <div className="profile-side-row">
              <span>
                Amis
              </span>

              <strong>
                {stats.friendsCount}
              </strong>
            </div>

            <div className="profile-side-row">
              <span>
                Temps de jeu
              </span>

              <strong>
                {Math.round(
                  stats.playtimeMinutes / 60
                )}{" "}
                h
              </strong>
            </div>

          </section>

          {editing && (
            <section className="glass-card profile-save-card">

              <div>
                <div className="eyebrow">
                  MODIFICATIONS
                </div>

                <p>
                  Tes changements ne seront
                  appliqués qu'après
                  enregistrement.
                </p>
              </div>

              <div className="profile-save-actions">

                <button
                  className="btn btn-primary"
                  onClick={save}
                  disabled={saving}
                >
                  {saving
                    ? "Enregistrement..."
                    : "✓ Enregistrer"}
                </button>

                <button
                  className="btn btn-ghost"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Annuler
                </button>

              </div>

            </section>
          )}

        </aside>

      </div>

    </div>
  );
}