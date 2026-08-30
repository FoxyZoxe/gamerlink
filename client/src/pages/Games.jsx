import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Games() {
  const showToast = useToast();
  const { user, refreshUser } = useAuth();

  const [catalog, setCatalog] = useState([]);
  const [myGames, setMyGames] = useState([]);
  const [friends, setFriends] = useState([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

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

      setCatalog(catalogRes.games || []);
      setMyGames(mineRes.userGames || []);
      setFriends(friendsRes.friends || []);
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const ownedIds = useMemo(
    () => new Set(myGames.map((game) => game.game_id)),
    [myGames]
  );

  const totalMinutes = useMemo(
    () =>
      myGames.reduce(
        (sum, game) =>
          sum + Number(game.playtime_minutes || 0),
        0
      ),
    [myGames]
  );

  const currentGame = useMemo(
    () =>
      catalog.find(
        (game) =>
          game.id === user?.current_game_id
      ),
    [catalog, user]
  );

  const filteredCatalog = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return catalog;

    return catalog.filter((game) =>
      game.name
        ?.toLowerCase()
        .includes(query)
    );
  }, [catalog, search]);

  const playingFriends = useMemo(
    () =>
      friends.filter(
        (friend) =>
          friend.status === "in_game" ||
          friend.current_game_id
      ),
    [friends]
  );

  async function setCurrentGame(gameId) {
    try {
      setActionLoading(
        gameId || "stop"
      );

      await api.setCurrentGame(gameId);

      await refreshUser();
      await load();

      if (gameId) {
        const game = catalog.find(
          (item) => item.id === gameId
        );

        showToast(
          `🎮 ${game?.name || "Jeu"} lancé`
        );
      } else {
        showToast(
          "✓ Tu as arrêté de jouer"
        );
      }
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }

  async function addGame(gameId) {
    try {
      setActionLoading(`add-${gameId}`);

      await api.addGameToLibrary(gameId);

      showToast("✓ Jeu ajouté à ta bibliothèque");

      await load();
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }

  function formatHours(minutes) {
    const hours = Math.floor(
      Number(minutes || 0) / 60
    );

    if (hours === 0) {
      return `${Math.round(
        Number(minutes || 0)
      )} min`;
    }

    return `${hours} h`;
  }

  return (
    <div className="games-page">

      {/* HEADER */}
      <div className="page-header games-header">
        <div>
          <div className="eyebrow">
            GAMERLINK GAME HUB
          </div>

          <h1>🎮 Mes jeux</h1>

          <p>
            Ta bibliothèque, ton activité et
            tes prochaines parties.
          </p>
        </div>

        <button
          className="btn btn-ghost"
          onClick={load}
          disabled={loading}
        >
          ↻ Actualiser
        </button>
      </div>

      {/* CURRENT GAME */}
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
                Ton profil indique maintenant
                que tu es en train de jouer.
              </p>
            </div>

            <button
              className="btn btn-ghost"
              disabled={
                actionLoading === "stop"
              }
              onClick={() =>
                setCurrentGame("")
              }
            >
              {actionLoading === "stop"
                ? "Arrêt..."
                : "⏹ Arrêter"}
            </button>
          </div>
        </section>
      )}

      {/* STATS */}
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
              {formatHours(totalMinutes)}
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

      {/* FRIENDS PLAYING */}
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
            {playingFriends.map((friend) => {
              const friendGame =
                catalog.find(
                  (game) =>
                    game.id ===
                    friend.current_game_id
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
            })}
          </div>
        </section>
      )}

      {/* LIBRARY */}
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
              Ajoute des jeux depuis le
              catalogue ci-dessous.
            </p>
          </div>
        ) : (
          <div className="games-library-grid">
            {myGames.map((userGame) => {
              const isCurrent =
                user?.current_game_id ===
                userGame.game_id;

              return (
                <div
                  className={
                    isCurrent
                      ? "glass-card game-library-card game-active"
                      : "glass-card game-library-card"
                  }
                  key={userGame.game_id}
                >
                  <div className="game-card-icon">
                    🎮
                  </div>

                  <div className="game-card-content">
                    <div className="game-card-top">
                      <div>
                        <h3>
                          {userGame.game?.name ||
                            "Jeu inconnu"}
                        </h3>

                        <div className="eyebrow font-mono">
                          {formatHours(
                            userGame.playtime_minutes
                          )}
                          {" "}
                          de jeu
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="game-playing-badge">
                          🟢 EN JEU
                        </span>
                      )}
                    </div>

                    <div className="game-card-actions">
                      {isCurrent ? (
                        <button
                          className="btn btn-ghost"
                          disabled={
                            actionLoading ===
                            "stop"
                          }
                          onClick={() =>
                            setCurrentGame("")
                          }
                        >
                          ⏹ Arrêter
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary"
                          disabled={
                            actionLoading ===
                            userGame.game_id
                          }
                          onClick={() =>
                            setCurrentGame(
                              userGame.game_id
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
            })}
          </div>
        )}
      </section>

      {/* CATALOG */}
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

        <div className="games-catalog-toolbar glass-card">
          <div className="field">
            <label>
              Rechercher un jeu
            </label>

            <input
              type="search"
              placeholder="Minecraft, Fortnite, Valheim..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>
        </div>

        {filteredCatalog.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="glyph">
              🔎
            </div>

            Aucun jeu trouvé.
          </div>
        ) : (
          <div className="catalog-list glass-card">
            {filteredCatalog.map(
              (game, index) => {
                const owned =
                  ownedIds.has(game.id);

                return (
                  <div
                    className="catalog-game-row"
                    key={game.id}
                  >
                    <div className="catalog-game-icon">
                      🎮
                    </div>

                    <div className="catalog-game-info">
                      <strong>
                        {game.name}
                      </strong>

                      {owned && (
                        <span>
                          ✓ Dans ta bibliothèque
                        </span>
                      )}
                    </div>

                    {owned ? (
                      <span className="eyebrow">
                        ✓ Possédé
                      </span>
                    ) : (
                      <button
                        className="btn btn-ghost"
                        disabled={
                          actionLoading ===
                          `add-${game.id}`
                        }
                        onClick={() =>
                          addGame(game.id)
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