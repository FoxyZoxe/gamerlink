import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import Avatar from "../components/Avatar.jsx";
import { statusMeta } from "../lib/status.js";

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showToast = useToast();

  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);

      const [profileRes, friendsRes] = await Promise.all([
        api.getProfile(id),
        api.getFriends(),
      ]);

      setProfile(profileRes);

      setFriends(friendsRes.friends || []);
      setIncomingRequests(friendsRes.incomingRequests || []);
      setOutgoingRequests(friendsRes.outgoingRequests || []);
    } catch (err) {
      showToast(`⚠ ${err.message}`);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id === user?.id) {
      navigate("/profil", { replace: true });
      return;
    }

    load();
  }, [id, user?.id]);

  if (loading) {
    return (
      <div className="glass-card empty-state">
        <div className="glyph">👤</div>
        Chargement du profil...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="glass-card empty-state">
        <div className="glyph">❌</div>
        Joueur introuvable.
      </div>
    );
  }

  /*
   * Selon ton backend, /users/:id peut retourner :
   *
   * { user, friendsCount, playtimeMinutes }
   *
   * ou directement certaines informations.
   *
   * On supporte les deux.
   */
  const player = profile.user || profile;

  const friendsCount =
    profile.friendsCount ?? 0;

  const playtimeMinutes =
    profile.playtimeMinutes ?? 0;

  const meta = statusMeta(player.status);

  const isFriend = friends.some(
    (friend) => friend.id === player.id
  );

  const incoming = incomingRequests.some(
    (request) => request.id === player.id
  );

  const outgoing = outgoingRequests.some(
    (request) => request.id === player.id
  );

  async function addFriend() {
    try {
      setActionLoading(true);

      await api.sendFriendRequest(player.id);

      showToast("✓ Demande d'ami envoyée");

      await load();
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function acceptFriend() {
    try {
      setActionLoading(true);

      await api.acceptFriendRequest(player.id);

      showToast("✓ Demande acceptée");

      await load();
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function removeFriend() {
    try {
      setActionLoading(true);

      await api.removeFriend(player.id);

      showToast("Ami supprimé");

      await load();
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  function openMessages() {
    navigate(
      `/messages?with=${encodeURIComponent(player.id)}`
    );
  }

  return (
    <div className="public-profile-page">

      <button
        className="btn btn-ghost public-profile-back"
        onClick={() => navigate(-1)}
      >
        ← Retour
      </button>

      {/* HERO */}
      <section className="glass-card public-profile-hero">

        <div className="public-profile-glow" />

        <Avatar
          user={player}
          size={110}
        />

        <div className="public-profile-identity">

          <div className="public-profile-name">
            <h1>{player.username}</h1>

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
            @{player.username}
          </div>

          {player.status === "in_game" && (
            <div className="profile-current-game">
              🎮

              <span>En train de jouer</span>

              {player.custom_status && (
                <strong>
                  {player.custom_status}
                </strong>
              )}
            </div>
          )}

        </div>

        <div className="public-profile-actions">

          {isFriend && (
            <button
              className="btn btn-primary"
              onClick={openMessages}
            >
              💬 Message
            </button>
          )}

          {!isFriend &&
            !incoming &&
            !outgoing && (
              <button
                className="btn btn-primary"
                disabled={actionLoading}
                onClick={addFriend}
              >
                👥 Ajouter
              </button>
            )}

          {incoming && (
            <button
              className="btn btn-primary"
              disabled={actionLoading}
              onClick={acceptFriend}
            >
              ✓ Accepter la demande
            </button>
          )}

          {outgoing && (
            <button
              className="btn btn-ghost"
              disabled
            >
              ⏳ Demande envoyée
            </button>
          )}

          {isFriend && (
            <button
              className="btn btn-ghost"
              disabled={actionLoading}
              onClick={removeFriend}
            >
              Retirer
            </button>
          )}

        </div>
      </section>

      {/* STATS */}
      <section className="public-profile-stats">

        <div className="glass-card profile-stat-card">
          <div className="profile-stat-icon">
            👥
          </div>

          <div>
            <strong>{friendsCount}</strong>
            <span>Amis</span>
          </div>
        </div>

        <div className="glass-card profile-stat-card">
          <div className="profile-stat-icon">
            ⏱️
          </div>

          <div>
            <strong>
              {Math.round(playtimeMinutes / 60)} h
            </strong>

            <span>Temps de jeu</span>
          </div>
        </div>

        <div className="glass-card profile-stat-card">
          <div className="profile-stat-icon">
            🎮
          </div>

          <div>
            <strong>
              {(player.favorite_games || []).length}
            </strong>

            <span>Jeux favoris</span>
          </div>
        </div>

      </section>

      {/* CONTENU */}
      <div className="public-profile-grid">

        <section className="glass-card profile-section">

          <div className="section-title">
            <h2>📝 À propos</h2>
          </div>

          <p
            className={
              player.description
                ? "profile-description"
                : "profile-description empty"
            }
          >
            {player.description ||
              "Ce joueur n'a pas encore ajouté de description."}
          </p>

        </section>

        <section className="glass-card profile-section">

          <div className="section-title">
            <h2>🎮 Jeux favoris</h2>
          </div>

          <div className="profile-game-tags">

            {(player.favorite_games || []).length === 0 && (
              <span className="profile-empty-tag">
                Aucun jeu favori
              </span>
            )}

            {(player.favorite_games || []).map(
              (game) => (
                <span
                  className="profile-game-tag"
                  key={game}
                >
                  🎮 {game}
                </span>
              )
            )}

          </div>

        </section>

      </div>
    </div>
  );
}