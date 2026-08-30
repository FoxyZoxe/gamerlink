import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import Avatar from "../components/Avatar.jsx";
import { statusMeta } from "../lib/status.js";

export default function Friends() {
  const showToast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
  });

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    try {
      const res = await api.getFriends();
      setData(res);
      setLoading(false);
    } catch (err) {
      showToast(`⚠ ${err.message}`);
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const res = await api.searchPlayers({
          q: query.trim(),
        });

        setResults(res.results);
      } catch (err) {
        showToast(`⚠ ${err.message}`);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [query]);

  async function sendRequest(id) {
    try {
      await api.sendFriendRequest(id);

      showToast("✓ Demande envoyée");

      setQuery("");
      setResults([]);
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    }
  }

  async function accept(id) {
    try {
      await api.acceptFriendRequest(id);

      showToast("✓ Demande acceptée");

      reload();
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    }
  }

  async function decline(id) {
    try {
      await api.declineFriendRequest(id);

      showToast("Demande refusée");

      reload();
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    }
  }

  async function remove(id) {
    try {
      await api.removeFriend(id);

      showToast("Ami supprimé");

      reload();
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    }
  }

  function openProfile(id) {
    navigate(`/profil/${id}`);
  }

  function openMessages(id) {
    navigate(`/messages?with=${encodeURIComponent(id)}`);
  }

  return (
    <div>

      {/* HEADER */}
      <div className="page-header">
        <div className="eyebrow">
          GAMERLINK SOCIAL
        </div>

        <h1>👥 Amis</h1>

        <p>
          {data.friends.length} ami
          {data.friends.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* RECHERCHE */}
      <div className="section">

        <div className="section-title">
          <h2>Ajouter un ami</h2>
        </div>

        <div
          style={{
            position: "relative",
            maxWidth: 520,
          }}
        >

          <input
            placeholder="🔎 Rechercher par pseudo..."
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
            style={{
              width: "100%",
            }}
          />

          {results.length > 0 && (
            <div
              className="glass-card"
              style={{
                marginTop: 8,
                overflow: "hidden",
                position: "absolute",
                width: "100%",
                zIndex: 20,
              }}
            >

              {results.map((r, i) => (
                <div
                  className="friend-row"
                  key={r.id}
                  style={{
                    borderTop:
                      i > 0
                        ? "1px solid var(--panel-border)"
                        : "none",
                  }}
                >

                  {/* PROFIL */}
                  <button
                    className="friend-profile-button"
                    onClick={() =>
                      openProfile(r.id)
                    }
                  >
                    <Avatar
                      user={r}
                      size={36}
                    />

                    <div className="meta">
                      <div className="name">
                        {r.username}
                      </div>

                      <div className="sub">
                        Voir le profil
                      </div>
                    </div>
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={() =>
                      sendRequest(r.id)
                    }
                  >
                    Ajouter
                  </button>

                </div>
              ))}

            </div>
          )}

        </div>
      </div>

      {/* DEMANDES REÇUES */}
      {data.incomingRequests.length > 0 && (
        <div className="section">

          <div className="section-title">
            <h2>Demandes reçues</h2>
          </div>

          <div className="glass-card">

            {data.incomingRequests.map(
              (r, i) => (
                <div
                  className="friend-row"
                  key={r.id}
                  style={{
                    borderTop:
                      i > 0
                        ? "1px solid var(--panel-border)"
                        : "none",
                  }}
                >

                  <button
                    className="friend-profile-button"
                    onClick={() =>
                      openProfile(r.id)
                    }
                  >
                    <Avatar
                      user={r}
                      size={40}
                      showRing={false}
                    />

                    <div className="meta">

                      <div className="name">
                        {r.username}
                      </div>

                      <div className="sub">
                        souhaite devenir ami
                      </div>

                    </div>
                  </button>

                  <div className="actions">

                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        accept(r.id)
                      }
                    >
                      Accepter
                    </button>

                    <button
                      className="btn btn-ghost"
                      onClick={() =>
                        decline(r.id)
                      }
                    >
                      Refuser
                    </button>

                  </div>

                </div>
              )
            )}

          </div>
        </div>
      )}

      {/* DEMANDES ENVOYÉES */}
      {data.outgoingRequests.length > 0 && (
        <div className="section">

          <div className="section-title">
            <h2>Demandes envoyées</h2>
          </div>

          <div className="glass-card">

            {data.outgoingRequests.map(
              (r, i) => (
                <div
                  className="friend-row"
                  key={r.id}
                  style={{
                    borderTop:
                      i > 0
                        ? "1px solid var(--panel-border)"
                        : "none",
                  }}
                >

                  <button
                    className="friend-profile-button"
                    onClick={() =>
                      openProfile(r.id)
                    }
                  >
                    <Avatar
                      user={r}
                      size={40}
                      showRing={false}
                    />

                    <div className="meta">

                      <div className="name">
                        {r.username}
                      </div>

                      <div className="sub">
                        en attente
                      </div>

                    </div>
                  </button>

                </div>
              )
            )}

          </div>
        </div>
      )}

      {/* AMIS */}
      <div className="section">

        <div className="section-title">
          <h2>Tous tes amis</h2>
        </div>

        <div className="glass-card">

          {loading && (
            <div className="empty-state">
              Chargement...
            </div>
          )}

          {!loading &&
            data.friends.length === 0 && (
              <div className="empty-state">

                <div className="glyph">
                  👥
                </div>

                Ta liste d'amis est vide
                pour l'instant.

              </div>
            )}

          {data.friends.map((f, i) => {

            const meta = statusMeta(
              f.status
            );

            return (
              <div
                className="friend-row friend-row-clickable"
                key={f.id}
                style={{
                  borderTop:
                    i > 0
                      ? "1px solid var(--panel-border)"
                      : "none",
                }}
              >

                {/* PROFIL */}
                <button
                  className="friend-profile-button"
                  onClick={() =>
                    openProfile(f.id)
                  }
                >
                  <Avatar
                    user={f}
                    size={42}
                  />

                  <div className="meta">

                    <div className="name">
                      {f.username}
                    </div>

                    <div
                      className="sub"
                      style={{
                        color: meta.color,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background:
                            meta.color,
                          display:
                            "inline-block",
                        }}
                      />

                      {meta.label}

                      {f.status ===
                        "in_game" &&
                        f.custom_status && (
                          <>
                            {" · "}
                            {f.custom_status}
                          </>
                        )}

                    </div>

                  </div>
                </button>

                <div className="link-thread" />

                {/* ACTIONS */}
                <div className="actions">

                  <button
                    className="btn btn-primary"
                    onClick={() =>
                      openMessages(f.id)
                    }
                    title="Envoyer un message"
                  >
                    💬
                  </button>

                  <button
                    className="btn btn-ghost"
                    onClick={() =>
                      openProfile(f.id)
                    }
                  >
                    Profil
                  </button>

                  <button
                    className="btn btn-ghost"
                    onClick={() =>
                      remove(f.id)
                    }
                  >
                    Retirer
                  </button>

                </div>

              </div>
            );
          })}

        </div>
      </div>

    </div>
  );
}