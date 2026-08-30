import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import Avatar from "../components/Avatar.jsx";
import { statusMeta } from "../lib/status.js";

const LANGUAGES = [
  { value: "", label: "Toutes les langues" },
  { value: "fr", label: "🇫🇷 Français" },
  { value: "en", label: "🇬🇧 Anglais" },
];

export default function Search() {
  const showToast = useToast();

  const [games, setGames] = useState([]);

  const [filters, setFilters] = useState({
    game: "",
    language: "",
    mic: false,
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getGamesCatalog()
      .then((res) => setGames(res.games || []))
      .catch(console.error);
  }, []);

  async function runSearch(e) {
    e?.preventDefault();

    setLoading(true);

    try {
      const res = await api.searchPlayers({
        game: filters.game,
        language: filters.language,
        mic: filters.mic ? "true" : "",
      });

      setResults(res.results || []);
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function invite(id) {
    try {
      await api.sendFriendRequest(id);
      showToast("✓ Demande d'ami envoyée");
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    }
  }

  function resetFilters() {
    setFilters({
      game: "",
      language: "",
      mic: false,
    });

    setResults(null);
  }

  return (
    <div className="search-page">

      {/* ============================================================
          HEADER
          ============================================================ */}

      <div className="page-header search-header">

        <div>
          <div className="eyebrow">
            GAMER FINDER
          </div>

          <h1>
            🔎 Trouver des joueurs
          </h1>

          <p>
            Trouve des joueurs compatibles
            pour ta prochaine partie.
          </p>
        </div>

        {results !== null && (
          <div className="search-result-count">
            <span className="font-mono">
              {results.length}
            </span>

            joueur{results.length > 1 ? "s" : ""}
          </div>
        )}

      </div>

      {/* ============================================================
          FILTRES
          ============================================================ */}

      <form
        className="glass-card search-filters"
        onSubmit={runSearch}
      >

        <div className="search-filters-title">
          <div>
            <div className="eyebrow">
              FILTRES
            </div>

            <h2>
              Quel joueur recherches-tu ?
            </h2>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={resetFilters}
          >
            Réinitialiser
          </button>
        </div>

        <div className="search-filter-grid">

          {/* JEU */}

          <div className="field">
            <label>🎮 Jeu</label>

            <select
              value={filters.game}
              onChange={(e) =>
                setFilters((current) => ({
                  ...current,
                  game: e.target.value,
                }))
              }
            >
              <option value="">
                Tous les jeux
              </option>

              {games.map((game) => (
                <option
                  key={game.id}
                  value={game.name}
                >
                  {game.name}
                </option>
              ))}
            </select>
          </div>

          {/* LANGUE */}

          <div className="field">
            <label>🌍 Langue</label>

            <select
              value={filters.language}
              onChange={(e) =>
                setFilters((current) => ({
                  ...current,
                  language: e.target.value,
                }))
              }
            >
              {LANGUAGES.map((language) => (
                <option
                  key={language.value}
                  value={language.value}
                >
                  {language.label}
                </option>
              ))}
            </select>
          </div>

          {/* MICRO */}

          <div className="field search-mic-field">

            <label>
              🎙️ Communication
            </label>

            <label className="search-checkbox">

              <input
                type="checkbox"
                checked={filters.mic}
                onChange={(e) =>
                  setFilters((current) => ({
                    ...current,
                    mic: e.target.checked,
                  }))
                }
              />

              <span>
                Micro requis
              </span>

            </label>

          </div>

        </div>

        <button
          className="btn btn-primary search-button"
          disabled={loading}
        >
          {loading
            ? "🔎 Recherche..."
            : "🔎 Rechercher des joueurs"}
        </button>

      </form>

      {/* ============================================================
          RESULTATS
          ============================================================ */}

      <section className="section">

        <div className="section-title">

          <h2>
            {results === null
              ? "Joueurs compatibles"
              : "Résultats"}
          </h2>

        </div>

        {results === null && (
          <div className="glass-card search-empty">

            <div className="search-empty-icon">
              🎮
            </div>

            <h3>
              Trouve ton prochain mate
            </h3>

            <p>
              Sélectionne tes critères
              puis lance une recherche.
            </p>

          </div>
        )}

        {results?.length === 0 && (
          <div className="glass-card search-empty">

            <div className="search-empty-icon">
              😶
            </div>

            <h3>
              Aucun joueur trouvé
            </h3>

            <p>
              Essaie de modifier tes filtres
              pour élargir la recherche.
            </p>

          </div>
        )}

        {results?.length > 0 && (
          <div className="search-results-grid">

            {results.map((player) => {

              const meta =
                statusMeta(player.status);

              return (
                <article
                  className="glass-card player-card"
                  key={player.id}
                >

                  {/* HEADER JOUEUR */}

                  <div className="player-card-header">

                    <Avatar
                      user={player}
                      size={56}
                    />

                    <div className="player-identity">

                      <Link
                        to={`/profil/${player.id}`}
                        className="player-name"
                      >
                        {player.username}
                      </Link>

                      <div
                        className="player-status"
                        style={{
                          color: meta.color,
                        }}
                      >
                        <span
                          className="player-status-dot"
                          style={{
                            background:
                              meta.color,
                          }}
                        />

                        {meta.label}
                      </div>

                    </div>

                  </div>

                  {/* JEU ACTUEL */}

                  {player.status === "in_game" &&
                    player.custom_status && (
                      <div className="player-current-game">

                        🎮{" "}
                        {player.custom_status}

                      </div>
                    )}

                  {/* JEUX FAVORIS */}

                  {player.favorite_games?.length > 0 && (
                    <div className="player-games">

                      {player.favorite_games
                        .slice(0, 4)
                        .map((game) => (
                          <span
                            className="player-game-tag"
                            key={game}
                          >
                            {game}
                          </span>
                        ))}

                    </div>
                  )}

                  {/* ACTIONS */}

                  <div className="player-card-actions">

                    <Link
                      to={`/profil/${player.id}`}
                      className="btn btn-ghost"
                    >
                      Profil
                    </Link>

                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        invite(player.id)
                      }
                    >
                      + Ajouter
                    </button>

                  </div>

                </article>
              );
            })}

          </div>
        )}

      </section>

    </div>
  );
}