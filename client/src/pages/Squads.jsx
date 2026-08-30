import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import Avatar from "../components/Avatar.jsx";

export default function Squads() {
  const navigate = useNavigate();

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

      const [gamesRes, squadsRes, friendsRes] =
        await Promise.all([
          api.getGamesCatalog(),
          api.getSquads(gameFilter),
          api.getFriends(),
        ]);

      setGames(gamesRes?.games || []);
      setSquads(squadsRes?.squads || []);
      setFriends(friendsRes?.friends || []);
    } catch (err) {
      console.error("Erreur chargement squads :", err);

      showToast(`⚠ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [gameFilter]);

  const mine = useMemo(() => {
    return squads.filter((squad) =>
      squad.members?.some(
        (member) =>
          String(member.id) === String(user?.id)
      )
    );
  }, [squads, user]);

  const available = useMemo(() => {
    const query = search.trim().toLowerCase();

    return squads
      .filter(
        (squad) =>
          !mine.some(
            (mySquad) =>
              String(mySquad.id) ===
              String(squad.id)
          )
      )
      .filter((squad) => {
        if (!query) return true;

        return (
          squad.name
            ?.toLowerCase()
            .includes(query) ||
          squad.description
            ?.toLowerCase()
            .includes(query) ||
          squad.game?.name
            ?.toLowerCase()
            .includes(query)
        );
      });
  }, [squads, mine, search]);

  async function create(event) {
    event.preventDefault();

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
      console.error("Erreur création squad :", err);

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
      console.error("Erreur action squad :", err);

      showToast(`⚠ ${err.message}`);
    }
  }

  function openSquad(squadId) {
    if (!squadId) {
      showToast("⚠ Impossible d'ouvrir cette squad");
      return;
    }

    navigate(`/squads/${squadId}`);
  }

  return (
    <div className="page">

      {/* =========================================================
          HEADER
      ========================================================= */}

      <div className="page-header squad-hero">

        <div>
          <div className="eyebrow">
            GAMERLINK V0.2
          </div>

          <h1>
            👥 Squads
          </h1>

          <p>
            Trouve des joueurs, crée ton équipe
            et lance une partie.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            setShowCreate(
              (value) => !value
            )
          }
        >
          {showCreate
            ? "Fermer"
            : "+ Créer une squad"}
        </button>

      </div>

      {/* =========================================================
          CREATION
      ========================================================= */}

      {showCreate && (
        <form
          className="glass-card squad-create"
          onSubmit={create}
        >

          <div className="section-title">

            <div>
              <div className="eyebrow">
                NOUVELLE ÉQUIPE
              </div>

              <h2>
                Créer une squad
              </h2>
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

              <label>
                Jeu
              </label>

              <select
                required
                value={form.gameId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    gameId:
                      event.target.value,
                  })
                }
              >

                <option value="">
                  Choisir un jeu
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

            <div className="field">

              <label>
                Nom de la squad
              </label>

              <input
                required
                maxLength={40}
                placeholder="Ex : Ranked ce soir"
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name:
                      event.target.value,
                  })
                }
              />

            </div>

          </div>

          <div className="field">

            <label>
              Description
            </label>

            <input
              maxLength={160}
              placeholder="Ex : chill, micro obligatoire, niveau moyen..."
              value={form.description}
              onChange={(event) =>
                setForm({
                  ...form,
                  description:
                    event.target.value,
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
              onClick={() =>
                setShowCreate(false)
              }
            >
              Annuler
            </button>

            <button
              type="submit"
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

      {/* =========================================================
          MES SQUADS
      ========================================================= */}

      <div className="section">

        <div className="section-title">

          <div>
            <div className="eyebrow">
              TON ÉQUIPEMENT
            </div>

            <h2>
              Mes squads
            </h2>
          </div>

          <span className="eyebrow">
            {mine.length} active
            {mine.length > 1 ? "s" : ""}
          </span>

        </div>

        {mine.length === 0 ? (

          <div className="glass-card empty-state">

            <div className="glyph">
              🚀
            </div>

            <h3>
              Aucune squad pour le moment
            </h3>

            <p>
              Crée ta première équipe ou
              rejoins des joueurs disponibles.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                setShowCreate(true)
              }
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
                onOpen={openSquad}
                mine
              />

            ))}

          </div>

        )}

      </div>

      {/* =========================================================
          SQUADS DISPONIBLES
      ========================================================= */}

      <div className="section">

        <div className="section-title">

          <div>
            <div className="eyebrow">
              TROUVER DES JOUEURS
            </div>

            <h2>
              Squads disponibles
            </h2>
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

        {/* FILTRES */}

        <div className="squad-filters glass-card">

          <div className="field">

            <label>
              Rechercher
            </label>

            <input
              type="search"
              placeholder="Nom, jeu, description..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

          </div>

          <div className="field">

            <label>
              Jeu
            </label>

            <select
              value={gameFilter}
              onChange={(event) =>
                setGameFilter(
                  event.target.value
                )
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

        {/* RESULTATS */}

        {loading ? (

          <div className="glass-card empty-state">

            <div className="glyph">
              ⏳
            </div>

            <h3>
              Chargement...
            </h3>

            <p>
              Recherche des squads disponibles.
            </p>

          </div>

        ) : available.length === 0 ? (

          <div className="glass-card empty-state">

            <div className="glyph">
              🛰️
            </div>

            <h3>
              Aucune squad trouvée
            </h3>

            <p>
              Essaie un autre jeu ou crée
              ta propre équipe.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                setShowCreate(true)
              }
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
                onOpen={openSquad}
              />

            ))}

          </div>

        )}

      </div>

    </div>
  );
}


/* ===============================================================
   CARTE SQUAD
================================================================ */

function SquadCard({
  squad,
  user,
  friends,
  onAction,
  onOpen,
  mine = false,
}) {

  const [invite, setInvite] =
    useState("");

  const isOwner =
    String(squad.owner_id) ===
    String(user?.id);

  const memberCount =
    squad.memberCount ??
    squad.members?.length ??
    0;

  const full =
    memberCount >= 8;

  const gameName =
    squad.game?.name ||
    "Jeu inconnu";

  const members =
    squad.members || [];

  const owner =
    members.find(
      (member) =>
        String(member.id) ===
        String(squad.owner_id)
    );

  return (

    <article
      className="glass-card squad-card"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "390px",
        padding: "20px",
      }}
    >

      {/* =====================================================
          EN-TÊTE
      ===================================================== */}

      <div
        className="squad-card-top"
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "flex-start",
          gap: "15px",
        }}
      >

        <div className="squad-game">

          <div className="eyebrow">
            🎮 {gameName}
          </div>

          <h3>
            {squad.name}
          </h3>

        </div>

        <div
          className={`squad-count ${
            full ? "full" : ""
          }`}
        >
          {memberCount}/8
        </div>

      </div>


      {/* =====================================================
          DESCRIPTION
      ===================================================== */}

      <p className="squad-description">

        {squad.description ||
          "Aucune description."}

      </p>


      {/* =====================================================
          PROPRIETAIRE
      ===================================================== */}

      {owner && (

        <div className="squad-owner">

          <Avatar
            user={owner}
            size={32}
          />

          <span>
            Créée par{" "}

            <strong>
              {owner.username}
            </strong>
          </span>

        </div>

      )}


      {/* =====================================================
          MEMBRES
      ===================================================== */}

      <div
        className="squad-members"
        style={{
          display: "flex",
          alignItems: "center",
          minHeight: "42px",
          marginTop: "14px",
        }}
      >

        {members
          .slice(0, 8)
          .map((member, index) => (

            <div
              key={member.id}
              className="squad-member"
              title={member.username}
              style={{
                marginLeft:
                  index === 0
                    ? "0"
                    : "-8px",
                position: "relative",
                zIndex:
                  10 - index,
              }}
            >

              <Avatar
                user={member}
                size={38}
              />

            </div>

          ))}

      </div>


      {/* =====================================================
          CAPACITE
      ===================================================== */}

      <div
        className="squad-capacity"
        style={{
          marginTop: "15px",
        }}
      >

        <div className="squad-capacity-bar">

          <span
            style={{
              width: `${Math.min(
                100,
                (memberCount / 8) *
                  100
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


      {/* =====================================================
          ESPACE
      ===================================================== */}

      <div
        style={{
          flex: 1,
        }}
      />


      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div
        className="squad-actions"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginTop: "18px",
        }}
      >

        {/* OUVRIR */}

        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            onOpen(squad.id)
          }
        >
          👁 Ouvrir
        </button>


        {/* REJOINDRE */}

        {!mine && !full && (

          <button
            type="button"
            className="btn btn-ghost"
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


        {/* COMPLETE */}

        {!mine && full && (

          <button
            type="button"
            className="btn btn-ghost"
            disabled
          >
            Squad complète
          </button>

        )}


        {/* QUITTER */}

        {mine && !isOwner && (

          <button
            type="button"
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


        {/* SUPPRIMER */}

        {isOwner && (

          <button
            type="button"
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


      {/* =====================================================
          INVITER
      ===================================================== */}

      {mine && !full && (

        <div
          className="squad-invite"
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "10px",
          }}
        >

          <select
            value={invite}
            onChange={(event) =>
              setInvite(
                event.target.value
              )
            }
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >

            <option value="">
              Inviter un ami...
            </option>

            {friends
              .filter(
                (friend) =>
                  !members.some(
                    (member) =>
                      String(
                        member.id
                      ) ===
                      String(
                        friend.id
                      )
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
            type="button"
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