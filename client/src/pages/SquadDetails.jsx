import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import Avatar from "../components/Avatar.jsx";


export default function SquadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user } = useAuth();
  const showToast = useToast();

  const [squad, setSquad] = useState(null);
  const [games, setGames] = useState([]);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);


  /* ==========================================================
     CHARGER LA SQUAD
  ========================================================== */

  const loadSquad = useCallback(async () => {
    if (!id) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      const [
        squadsRes,
        gamesRes,
        friendsRes,
      ] = await Promise.all([
        api.getSquads(),
        api.getGamesCatalog(),
        api.getFriends(),
      ]);

      const allSquads =
        squadsRes?.squads || [];

      const allGames =
        gamesRes?.games || [];

      const allFriends =
        friendsRes?.friends || [];

      const foundSquad =
        allSquads.find(
          (item) =>
            String(item.id) === String(id)
        );

      if (!foundSquad) {
        console.warn(
          "⚠️ Squad introuvable :",
          id
        );

        setSquad(null);
        setError(true);
        return;
      }

      console.log(
        "✅ Squad chargée :",
        foundSquad
      );

      setSquad(foundSquad);
      setGames(allGames);
      setFriends(allFriends);
      setError(false);

    } catch (err) {
      console.error(
        "❌ Erreur chargement squad :",
        err
      );

      setError(true);

      showToast(
        `⚠ ${err.message}`
      );

    } finally {
      setLoading(false);
    }
  }, [id, showToast]);


  /* ==========================================================
     CHARGER LES MESSAGES
  ========================================================== */

  const loadMessages = useCallback(async () => {
    if (!id) return;

    try {
      const result =
        await api.getSquadMessages(id);

      setMessages(
        result?.messages ||
        result?.squadMessages ||
        []
      );

    } catch (err) {
      console.warn(
        "⚠️ Impossible de charger les messages :",
        err
      );
    }
  }, [id]);


  /* ==========================================================
     CHARGEMENT INITIAL
  ========================================================== */

  useEffect(() => {
    setLoading(true);
    setError(false);

    loadSquad();
    loadMessages();
  }, [
    id,
    loadSquad,
    loadMessages,
  ]);


  /* ==========================================================
     ACTUALISATION CHAT
  ========================================================== */

  useEffect(() => {
    if (!id) return;

    const interval =
      setInterval(() => {
        loadMessages();
      }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [
    id,
    loadMessages,
  ]);


  /* ==========================================================
     JEU
  ========================================================== */

  const game = useMemo(() => {
    if (!squad) return null;

    return (
      games.find(
        (item) =>
          String(item.id) ===
          String(squad.game_id)
      ) ||
      squad.game ||
      null
    );
  }, [
    games,
    squad,
  ]);


  /* ==========================================================
     MEMBRES
  ========================================================== */

  const members =
    squad?.members || [];

  const memberCount =
    squad?.memberCount ??
    members.length;


  /* ==========================================================
     PROPRIÉTAIRE
  ========================================================== */

  const owner = members.find(
    (member) =>
      String(member.id) ===
      String(squad?.owner_id)
  );


  /* ==========================================================
     UTILISATEUR DANS LA SQUAD
  ========================================================== */

  const isMember =
    members.some(
      (member) =>
        String(member.id) ===
        String(user?.id)
    );

  const isOwner =
    String(squad?.owner_id) ===
    String(user?.id);


  /* ==========================================================
     PRÉSENCE
  ========================================================== */

  function getPresence(member) {
    const isMe =
      String(member.id) ===
      String(user?.id);

    if (isMe) {
      if (user?.current_game_id) {
        const currentGame =
          games.find(
            (item) =>
              String(item.id) ===
              String(
                user.current_game_id
              )
          );

        return {
          type: "game",
          label:
            currentGame
              ? `Joue à ${currentGame.name}`
              : "En jeu",
        };
      }

      if (user?.status === "online") {
        return {
          type: "online",
          label: "En ligne",
        };
      }

      return {
        type: "offline",
        label: "Hors ligne",
      };
    }

    const friend =
      friends.find(
        (item) =>
          String(item.id) ===
          String(member.id)
      );

    if (!friend) {
      return {
        type: "offline",
        label: "Hors ligne",
      };
    }

    if (
      friend.status === "in_game" ||
      friend.current_game_id
    ) {
      const currentGame =
        games.find(
          (item) =>
            String(item.id) ===
            String(
              friend.current_game_id
            )
        );

      return {
        type: "game",
        label:
          currentGame
            ? `Joue à ${currentGame.name}`
            : "En jeu",
      };
    }

    if (friend.status === "online") {
      return {
        type: "online",
        label: "En ligne",
      };
    }

    return {
      type: "offline",
      label: "Hors ligne",
    };
  }


  /* ==========================================================
     ENVOYER MESSAGE
  ========================================================== */

  async function sendMessage(event) {
    event.preventDefault();

    const content =
      message.trim();

    if (!content || sending) {
      return;
    }

    try {
      setSending(true);

      await api.sendSquadMessage(
        id,
        content
      );

      setMessage("");

      await loadMessages();

    } catch (err) {
      console.error(
        "❌ Erreur envoi message :",
        err
      );

      showToast(
        `⚠ ${err.message}`
      );

    } finally {
      setSending(false);
    }
  }


  /* ==========================================================
     QUITTER
  ========================================================== */

  async function leaveSquad() {
    try {
      await api.leaveSquad(id);

      showToast(
        "✓ Tu as quitté la squad"
      );

      navigate("/squads");

    } catch (err) {
      console.error(
        "❌ Erreur départ squad :",
        err
      );

      showToast(
        `⚠ ${err.message}`
      );
    }
  }


  /* ==========================================================
     SUPPRIMER
  ========================================================== */

  async function deleteSquad() {
    try {
      await api.deleteSquad(id);

      showToast(
        "✓ Squad supprimée"
      );

      navigate("/squads");

    } catch (err) {
      console.error(
        "❌ Erreur suppression squad :",
        err
      );

      showToast(
        `⚠ ${err.message}`
      );
    }
  }


  /* ==========================================================
     DATE MESSAGE
  ========================================================== */

  function formatMessageDate(date) {
    if (!date) return "";

    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return "";
    }

    return parsed.toLocaleTimeString(
      "fr-FR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }


  /* ==========================================================
     CHARGEMENT
  ========================================================== */

  if (loading) {
    return (
      <div className="page">

        <div
          className="glass-card empty-state"
          style={{
            minHeight: "300px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div className="glyph">
            ⏳
          </div>

          <h3>
            Chargement de la squad...
          </h3>

          <p>
            Récupération des joueurs et
            des informations de l'équipe.
          </p>
        </div>

      </div>
    );
  }


  /* ==========================================================
     ERREUR
  ========================================================== */

  if (error || !squad) {
    return (
      <div className="page">

        <div
          className="glass-card empty-state"
          style={{
            minHeight: "300px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div className="glyph">
            👥
          </div>

          <h3>
            Squad introuvable
          </h3>

          <p>
            Cette squad n'existe plus ou
            n'est plus disponible.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              navigate("/squads")
            }
          >
            ← Retour aux squads
          </button>
        </div>

      </div>
    );
  }


  /* ==========================================================
     INTERFACE
  ========================================================== */

  return (
    <div className="page squad-details-page">

      {/* RETOUR */}

      <button
        type="button"
        className="btn btn-ghost"
        onClick={() =>
          navigate("/squads")
        }
        style={{
          marginBottom: "20px",
        }}
      >
        ← Retour aux squads
      </button>


      {/* ======================================================
          HEADER
      ====================================================== */}

      <section
        className="glass-card"
        style={{
          padding: "28px",
          marginBottom: "24px",
          position: "relative",
          overflow: "hidden",
        }}
      >

        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at top right, rgba(120,80,255,0.16), transparent 45%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >

          <div
            style={{
              width: "78px",
              height: "78px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.5rem",
              background:
                "rgba(120,80,255,0.14)",
              border:
                "1px solid rgba(120,80,255,0.25)",
              boxShadow:
                "0 0 30px rgba(120,80,255,0.15)",
              flexShrink: 0,
            }}
          >
            👥
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >

            <div className="eyebrow">
              🎮 {game?.name || "Jeu"}
            </div>

            <h1
              style={{
                margin: "5px 0",
              }}
            >
              {squad.name}
            </h1>

            <p
              style={{
                margin: 0,
                opacity: 0.7,
              }}
            >
              {squad.description ||
                "Aucune description."}
            </p>

            <div
              style={{
                marginTop: "12px",
                display: "flex",
                gap: "15px",
                flexWrap: "wrap",
              }}
            >

              <span className="eyebrow">
                👥 {memberCount}/8 joueurs
              </span>

              {game && (
                <span className="eyebrow">
                  🎮 {game.name}
                </span>
              )}

            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          CONTENU
      ====================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(280px, 0.8fr) minmax(350px, 1.2fr)",
          gap: "24px",
          alignItems: "start",
        }}
      >


        {/* ====================================================
            MEMBRES
        ==================================================== */}

        <section
          className="glass-card"
          style={{
            padding: "22px",
          }}
        >

          <div className="section-title">

            <div>
              <div className="eyebrow">
                ÉQUIPE
              </div>

              <h2>
                Membres
              </h2>
            </div>

            <span className="eyebrow">
              {memberCount}/8
            </span>

          </div>


          <div
            style={{
              display: "grid",
              gap: "10px",
            }}
          >

            {members.map(
              (member) => {

                const presence =
                  getPresence(member);

                const memberIsOwner =
                  String(member.id) ===
                  String(squad.owner_id);

                return (
                  <div
                    key={member.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "11px",
                      borderRadius: "14px",
                      background:
                        "rgba(255,255,255,0.035)",
                      border:
                        "1px solid rgba(255,255,255,0.05)",
                    }}
                  >

                    <div
                      style={{
                        position: "relative",
                        flexShrink: 0,
                      }}
                    >

                      <Avatar
                        user={member}
                        size={44}
                      />

                      <span
                        style={{
                          position: "absolute",
                          right: "-2px",
                          bottom: "-2px",
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          border:
                            "2px solid var(--bg)",
                          background:
                            presence.type === "game"
                              ? "#55ff88"
                              : presence.type === "online"
                              ? "#55aaff"
                              : "#555",
                          boxShadow:
                            presence.type === "game"
                              ? "0 0 9px rgba(85,255,136,0.8)"
                              : "none",
                        }}
                      />

                    </div>


                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >

                      <strong>
                        {member.username}
                      </strong>

                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "0.72rem",
                          fontFamily:
                            "var(--font-mono)",
                          fontWeight: 700,
                          color:
                            presence.type === "game"
                              ? "#55ff88"
                              : presence.type === "online"
                              ? "#55aaff"
                              : "rgba(255,255,255,0.4)",
                        }}
                      >
                        {presence.type === "game"
                          ? "🟢 "
                          : presence.type === "online"
                          ? "🔵 "
                          : "⚫ "}

                        {presence.label}
                      </div>

                    </div>


                    {memberIsOwner && (
                      <span
                        title="Propriétaire"
                        style={{
                          fontSize: "1.1rem",
                        }}
                      >
                        👑
                      </span>
                    )}

                  </div>
                );
              }
            )}

          </div>


          {/* PROPRIÉTAIRE */}

          {owner && (
            <div
              style={{
                marginTop: "18px",
                paddingTop: "16px",
                borderTop:
                  "1px solid rgba(255,255,255,0.08)",
              }}
            >

              <div className="eyebrow">
                PROPRIÉTAIRE
              </div>

              <div
                style={{
                  marginTop: "5px",
                }}
              >
                👑{" "}
                <strong>
                  {owner.username}
                </strong>
              </div>

            </div>
          )}


          {/* ACTIONS */}

          {isMember && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "20px",
                flexWrap: "wrap",
              }}
            >

              {!isOwner && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={leaveSquad}
                >
                  🚪 Quitter
                </button>
              )}

              {isOwner && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={deleteSquad}
                >
                  🗑 Supprimer la squad
                </button>
              )}

            </div>
          )}

        </section>


        {/* ====================================================
            CHAT
        ==================================================== */}

        <section
          className="glass-card"
          style={{
            padding: "22px",
            minHeight: "560px",
            display: "flex",
            flexDirection: "column",
          }}
        >

          <div className="section-title">

            <div>
              <div className="eyebrow">
                COMMUNICATION
              </div>

              <h2>
                💬 Chat de la squad
              </h2>
            </div>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={loadMessages}
              title="Actualiser"
            >
              ↻
            </button>

          </div>


          {/* MESSAGES */}

          <div
            style={{
              flex: 1,
              minHeight: "350px",
              maxHeight: "500px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              padding: "10px 4px",
            }}
          >

            {messages.length === 0 ? (

              <div
                className="empty-state"
                style={{
                  margin: "auto",
                }}
              >

                <div className="glyph">
                  💬
                </div>

                <h3>
                  Aucun message
                </h3>

                <p>
                  Sois le premier à envoyer
                  un message.
                </p>

              </div>

            ) : (

              messages.map(
                (item, index) => {

                  const sender =
                    item.user ||
                    item.sender ||
                    item.author ||
                    {};

                  const senderId =
                    item.user_id ||
                    item.sender_id ||
                    sender.id;

                  const ownMessage =
                    String(senderId) ===
                    String(user?.id);

                  const content =
                    item.content ||
                    item.message ||
                    "";

                  const date =
                    item.created_at ||
                    item.createdAt ||
                    item.created;

                  return (
                    <div
                      key={
                        item.id ||
                        `${senderId}-${index}`
                      }
                      style={{
                        display: "flex",
                        justifyContent:
                          ownMessage
                            ? "flex-end"
                            : "flex-start",
                      }}
                    >

                      <div
                        style={{
                          maxWidth: "75%",
                          padding:
                            "10px 14px",
                          borderRadius:
                            "14px",
                          background:
                            ownMessage
                              ? "rgba(120,80,255,0.22)"
                              : "rgba(255,255,255,0.05)",
                          border:
                            "1px solid rgba(255,255,255,0.05)",
                        }}
                      >

                        {!ownMessage && (
                          <div
                            className="eyebrow"
                            style={{
                              marginBottom: "5px",
                            }}
                          >
                            {sender.username ||
                              "Joueur"}
                          </div>
                        )}

                        <div>
                          {content}
                        </div>

                        {date && (
                          <div
                            style={{
                              fontSize: "0.65rem",
                              opacity: 0.45,
                              marginTop: "5px",
                              textAlign: "right",
                            }}
                          >
                            {formatMessageDate(
                              date
                            )}
                          </div>
                        )}

                      </div>

                    </div>
                  );
                }
              )

            )}

          </div>


          {/* ENVOI */}

          {isMember ? (

            <form
              onSubmit={sendMessage}
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "15px",
              }}
            >

              <input
                type="text"
                value={message}
                maxLength={500}
                placeholder="Écrire un message..."
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                style={{
                  flex: 1,
                }}
              />

              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  sending ||
                  !message.trim()
                }
              >
                {sending
                  ? "..."
                  : "➤"}
              </button>

            </form>

          ) : (

            <div
              className="eyebrow"
              style={{
                marginTop: "15px",
                textAlign: "center",
              }}
            >
              Rejoins cette squad pour
              participer au chat.
            </div>

          )}

        </section>

      </div>

    </div>
  );
}