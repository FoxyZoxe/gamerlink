import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import Avatar from "../components/Avatar.jsx";

export default function Squads() {
  const { user } = useAuth();
  const showToast = useToast();

  const [games, setGames] = useState([]);
  const [squads, setSquads] = useState([]);
  const [friends, setFriends] = useState([]);

  const [gameFilter, setGameFilter] = useState("");
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    gameId: "",
    name: "",
    description: "",
  });

  async function load() {
    try {
      setLoading(true);

      const [gamesRes, squadsRes, friendsRes] = await Promise.all([
        api.getGamesCatalog(),
        api.getSquads(gameFilter),
        api.getFriends(),
      ]);

      setGames(gamesRes.games || []);
      setSquads(squadsRes.squads || []);
      setFriends(friendsRes.friends || []);
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [gameFilter]);

  const mine = useMemo(
    () =>
      squads.filter((s) =>
        s.members?.some((m) => m.id === user?.id)
      ),
    [squads, user]
  );

  const available = useMemo(() => {
    const query = search.trim().toLowerCase();

    return squads
      .filter((s) => !mine.some((m) => m.id === s.id))
      .filter((s) => {
        if (!query) return true;

        return (
          s.name?.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.game?.name?.toLowerCase().includes(query)
        );
      });
  }, [squads, mine, search]);

  async function create(e) {
    e.preventDefault();

    if (!form.gameId) {
      showToast("⚠ Choisis un jeu");
      return;
    }

    if (!form.name.trim()) {
      showToast("⚠ Donne un nom à ta squad");
      return;
    }

    try {
      setCreating(true);

      await api.createSquad({
        gameId: form.gameId,
        name: form.name.trim(),
        description: form.description.trim(),
      });

      showToast("✓ Squad créée");

      setForm({
        gameId: "",
        name: "",
        description: "",
      });

      setShowCreate(false);
      await load();
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function action(fn, success) {
    try {
      await fn();
      showToast(`✓ ${success}`);
      await load();
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    }
  }

  return (
    <div className="page">
      {/* HEADER */}
      <div className="page-header squad-hero">
        <div>
          <div className="eyebrow">GAMERLINK V0.2</div>

          <h1>👥 Squads</h1>

          <p>
            Trouve des joueurs, crée ton équipe et lance une partie.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowCreate((value) => !value)}
        >
          {showCreate ? "Fermer" : "+ Créer une squad"}
        </button>
      </div>

      {/* CREATE */}
      {showCreate && (
        <form
          className="glass-card squad-create"
          onSubmit={create}
        >
          <div className="section-title">
            <div>
              <div className="eyebrow">NOUVELLE ÉQUIPE</div>
              <h2>Créer une squad</h2>
            </div>

            <span className="eyebrow">
              jusqu'à 8 joueurs
            </span>
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <div className="field">
              <label>Jeu</label>

              <select
                required
                value={form.gameId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gameId: e.target.value,
                  })
                }
              >
                <option value="">
                  Choisir un jeu
                </option>

                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Nom de la squad</label>

              <input
                required
                maxLength={40}
                placeholder="Ex : Ranked ce soir"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="field">
            <label>Description</label>

            <input
              maxLength={160}
              placeholder="Ex : chill, micro obligatoire, niveau moyen..."
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
            />

            <small>
              {form.description.length}/160
            </small>
          </div>

          <div className="squad-create-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowCreate(false)}
            >
              Annuler
            </button>

            <button
              className="btn btn-primary"
              disabled={creating}
            >
              {creating
                ? "Création..."
                : "🚀 Créer la squad"}
            </button>
          </div>
        </form>
      )}

      {/* MY SQUADS */}
      <div className="section">
        <div className="section-title">
          <div>
            <div className="eyebrow">TON ÉQUIPEMENT</div>
            <h2>Mes squads</h2>
          </div>

          <span className="eyebrow">
            {mine.length} active
            {mine.length > 1 ? "s" : ""}
          </span>
        </div>

        {mine.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="glyph">🚀</div>

            <h3>Aucune squad pour le moment</h3>

            <p>
              Crée ta première équipe ou rejoins des joueurs
              disponibles.
            </p>

            <button
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
            >
              + Créer ma squad
            </button>
          </div>
        ) : (
          <div className="grid grid-2">
            {mine.map((squad) => (
              <SquadCard
                key={squad.id}
                squad={squad}
                user={user}
                friends={friends}
                onAction={action}
                mine
              />
            ))}
          </div>
        )}
      </div>

      {/* AVAILABLE SQUADS */}
      <div className="section">
        <div className="section-title">
          <div>
            <div className="eyebrow">
              TROUVER DES JOUEURS
            </div>
            <h2>Squads disponibles</h2>
          </div>

          <button
            className="btn btn-ghost"
            onClick={load}
            disabled={loading}
          >
            ↻ Actualiser
          </button>
        </div>

        {/* FILTERS */}
        <div className="squad-filters glass-card">
          <div className="field">
            <label>Rechercher</label>

            <input
              type="search"
              placeholder="Nom, jeu, description..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          <div className="field">
            <label>Jeu</label>

            <select
              value={gameFilter}
              onChange={(e) =>
                setGameFilter(e.target.value)
              }
            >
              <option value="">
                Tous les jeux
              </option>

              {games.map((game) => (
                <option
                  key={game.id}
                  value={game.id}
                >
                  {game.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="glass-card empty-state">
            <div className="glyph">⏳</div>
            Chargement des squads...
          </div>
        ) : available.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="glyph">🛰️</div>

            <h3>Aucune squad trouvée</h3>

            <p>
              Essaie un autre jeu ou crée ta propre équipe.
            </p>

            <button
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
            >
              + Créer une squad
            </button>
          </div>
        ) : (
          <div className="grid grid-2">
            {available.map((squad) => (
              <SquadCard
                key={squad.id}
                squad={squad}
                user={user}
                friends={friends}
                onAction={action}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SquadCard({
  squad,
  user,
  friends,
  onAction,
  mine,
}) {
  const [invite, setInvite] = useState("");

  const isOwner = squad.owner_id === user?.id;

  const memberCount =
    squad.memberCount ??
    squad.members?.length ??
    0;

  const full = memberCount >= 8;

  const gameName =
    squad.game?.name ||
    "Jeu inconnu";

  const owner =
    squad.members?.find(
      (member) => member.id === squad.owner_id
    );

  return (
    <article className="glass-card squad-card">
      {/* TOP */}
      <div className="squad-card-top">
        <div className="squad-game">
          <div className="eyebrow">
            🎮 {gameName}
          </div>

          <h3>{squad.name}</h3>
        </div>

        <div
          className={`squad-count ${
            full ? "full" : ""
          }`}
        >
          {memberCount}/8
        </div>
      </div>

      {/* DESCRIPTION */}
      <p className="squad-description">
        {squad.description ||
          "Aucune description."}
      </p>

      {/* OWNER */}
      {owner && (
        <div className="squad-owner">
          <Avatar
            user={owner}
            size={28}
          />

          <span>
            Créée par{" "}
            <strong>
              {owner.username}
            </strong>
          </span>
        </div>
      )}

      {/* MEMBERS */}
      <div className="squad-members">
        {squad.members
          ?.slice(0, 8)
          .map((member) => (
            <div
              key={member.id}
              className="squad-member"
              title={member.username}
            >
              <Avatar
                user={member}
                size={34}
              />
            </div>
          ))}
      </div>

      {/* CAPACITY */}
      <div className="squad-capacity">
        <div className="squad-capacity-bar">
          <span
            style={{
              width: `${Math.min(
                100,
                (memberCount / 8) * 100
              )}%`,
            }}
          />
        </div>

        <span>
          {full
            ? "Squad complète"
            : `${8 - memberCount} place${
                8 - memberCount > 1
                  ? "s"
                  : ""
              } disponible${
                8 - memberCount > 1
                  ? "s"
                  : ""
              }`}
        </span>
      </div>

      {/* ACTIONS */}
      <div className="squad-actions">
        {!mine && !full && (
          <button
            className="btn btn-primary"
            onClick={() =>
              onAction(
                () =>
                  api.joinSquad(
                    squad.id
                  ),
                "Squad rejointe"
              )
            }
          >
            ➕ Rejoindre
          </button>
        )}

        {!mine && full && (
          <button
            className="btn btn-ghost"
            disabled
          >
            Squad complète
          </button>
        )}

        {mine && !isOwner && (
          <button
            className="btn btn-ghost"
            onClick={() =>
              onAction(
                () =>
                  api.leaveSquad(
                    squad.id
                  ),
                "Squad quittée"
              )
            }
          >
            🚪 Quitter
          </button>
        )}

        {isOwner && (
          <button
            className="btn btn-danger"
            onClick={() =>
              onAction(
                () =>
                  api.deleteSquad(
                    squad.id
                  ),
                "Squad supprimée"
              )
            }
          >
            🗑 Fermer
          </button>
        )}
      </div>

      {/* INVITE */}
      {mine && !full && (
        <div className="squad-invite">
          <select
            value={invite}
            onChange={(e) =>
              setInvite(e.target.value)
            }
          >
            <option value="">
              Inviter un ami...
            </option>

            {friends
              .filter(
                (friend) =>
                  !squad.members?.some(
                    (member) =>
                      member.id ===
                      friend.id
                  )
              )
              .map((friend) => (
                <option
                  key={friend.id}
                  value={friend.id}
                >
                  {friend.username}
                </option>
              ))}
          </select>

          <button
            className="btn btn-ghost"
            disabled={!invite}
            onClick={() =>
              onAction(
                () =>
                  api.inviteToSquad(
                    squad.id,
                    invite
                  ),
                "Invitation envoyée"
              )
            }
          >
            Inviter
          </button>
        </div>
      )}
    </article>
  );
}