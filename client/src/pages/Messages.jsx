import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";

export default function Messages() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const activeId = params.get("with");

  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);

  const bottomRef = useRef(null);

  async function loadConversations() {
    try {
      const res = await api.getConversations();
      setConversations(res.conversations || []);

      const friendsRes = await api.getFriends();
      setFriends(friendsRes.friends || []);
    } catch (err) {
      console.error("Erreur conversations :", err);
    }
  }

  async function loadThread(id = activeId, silent = false) {
    if (!id) return;

    try {
      if (!silent) {
        setLoadingThread(true);
      }

      const res = await api.getThread(id);

      setThread((current) => {
        /*
         * On ne remplace pas inutilement le tableau si rien
         * n'a changé. Ça évite des animations/scrolls inutiles.
         */
        if (
          current.length === res.messages.length &&
          current.length > 0 &&
          current[current.length - 1]?.id ===
            res.messages[res.messages.length - 1]?.id
        ) {
          return current;
        }

        return res.messages;
      });

      if (!silent) {
        setLoadingThread(false);
      }
    } catch (err) {
      console.error("Erreur messages :", err);

      if (!silent) {
        setLoadingThread(false);
      }
    }
  }

  /*
   * Chargement initial des conversations.
   */
  useEffect(() => {
    loadConversations();
  }, []);

  /*
   * Chargement de la conversation sélectionnée.
   */
  useEffect(() => {
    if (!activeId) {
      setThread([]);
      return;
    }

    loadThread(activeId);
  }, [activeId]);

  /*
   * 🔄 ACTUALISATION AUTOMATIQUE
   *
   * Toutes les 2 secondes, on vérifie si un nouveau message
   * est arrivé.
   */
  useEffect(() => {
    if (!activeId) return;

    const interval = setInterval(() => {
      loadThread(activeId, true);
      loadConversations();
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [activeId]);

  /*
   * Descendre automatiquement vers le dernier message
   * uniquement lorsqu'un nouveau message arrive.
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [thread]);

  async function send(e) {
    e.preventDefault();

    if (!draft.trim() || !activeId) return;

    const content = draft.trim();

    setDraft("");

    try {
      const { message } =
        await api.sendMessage(
          activeId,
          content
        );

      setThread((current) => [
        ...current,
        message,
      ]);

      await loadConversations();
    } catch (err) {
      setDraft(content);

      console.error(
        "Erreur envoi message :",
        err
      );
    }
  }

  const activePartner =
    conversations.find(
      (c) => c.partner.id === activeId
    )?.partner ||
    friends.find(
      (f) => f.id === activeId
    );

  const friendsWithoutThread =
    friends.filter(
      (f) =>
        !conversations.some(
          (c) => c.partner.id === f.id
        )
    );

  return (
    <div>

      <div className="page-header">
        <div className="eyebrow">
          GAMERLINK CHAT
        </div>

        <h1>💬 Messages</h1>

        <p>
          Discute avec tes amis.
        </p>
      </div>

      <div
        className="glass-card"
        style={{
          display: "flex",
          height: "70vh",
          overflow: "hidden",
        }}
      >

        {/* CONVERSATIONS */}
        <div
          style={{
            width: 280,
            borderRight:
              "1px solid var(--panel-border)",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >

          {conversations.length === 0 &&
            friendsWithoutThread.length === 0 && (
              <div className="empty-state">
                <div className="glyph">
                  💬
                </div>

                Aucune conversation.
              </div>
            )}

          {conversations.map((c) => (
            <button
              key={c.partner.id}
              onClick={() =>
                setParams({
                  with: c.partner.id,
                })
              }
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                width: "100%",
                padding: "12px 14px",
                background:
                  activeId === c.partner.id
                    ? "rgba(123,47,247,0.12)"
                    : "transparent",
                border: "none",
                borderBottom:
                  "1px solid var(--panel-border)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >

              <Avatar
                user={c.partner}
                size={36}
              />

              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                }}
              >

                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.86rem",
                  }}
                >
                  {c.partner.username}
                </div>

                <div
                  style={{
                    fontSize: "0.76rem",
                    color: "var(--muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.lastMessage.sender_id ===
                  user.id
                    ? "Toi : "
                    : ""}

                  {c.lastMessage.content}
                </div>

              </div>

              {c.unread > 0 && (
                <span
                  className="font-mono"
                  style={{
                    background:
                      "var(--gradient-link)",
                    borderRadius: 12,
                    fontSize: "0.7rem",
                    padding: "2px 7px",
                  }}
                >
                  {c.unread}
                </span>
              )}

            </button>
          ))}

          {friendsWithoutThread.length > 0 && (
            <>
              <div
                className="eyebrow"
                style={{
                  padding:
                    "12px 14px 6px",
                }}
              >
                Démarrer une conversation
              </div>

              {friendsWithoutThread.map(
                (f) => (
                  <button
                    key={f.id}
                    onClick={() =>
                      setParams({
                        with: f.id,
                      })
                    }
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      width: "100%",
                      padding:
                        "12px 14px",
                      background:
                        activeId === f.id
                          ? "rgba(123,47,247,0.12)"
                          : "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >

                    <Avatar
                      user={f}
                      size={32}
                    />

                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.84rem",
                      }}
                    >
                      {f.username}
                    </div>

                  </button>
                )
              )}
            </>
          )}

        </div>

        {/* CHAT */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >

          {!activePartner && (
            <div
              className="empty-state"
              style={{
                margin: "auto",
              }}
            >
              <div className="glyph">
                ✉️
              </div>

              Choisis une conversation
              pour commencer.
            </div>
          )}

          {activePartner && (
            <>
              {/* HEADER CHAT */}
              <div
                style={{
                  padding:
                    "14px 20px",
                  borderBottom:
                    "1px solid var(--panel-border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >

                <Avatar
                  user={activePartner}
                  size={32}
                />

                <div
                  style={{
                    fontWeight: 700,
                  }}
                >
                  {activePartner.username}
                </div>

                {/* INDICATEUR TEMPS RÉEL */}
                <span
                  className="chat-live-indicator"
                  title="Actualisation automatique"
                >
                  <span />
                  LIVE
                </span>

              </div>

              {/* MESSAGES */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: 20,
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: 8,
                }}
              >

                {loadingThread && (
                  <div className="empty-state">
                    Chargement...
                  </div>
                )}

                {!loadingThread &&
                  thread.length === 0 && (
                    <div
                      className="empty-state"
                      style={{
                        margin: "auto",
                      }}
                    >
                      <div className="glyph">
                        👋
                      </div>

                      Aucun message.
                      <br />

                      Commence la conversation !
                    </div>
                  )}

                {!loadingThread &&
                  thread.map((m) => {

                    const mine =
                      m.sender_id ===
                      user.id;

                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: mine
                            ? "flex-end"
                            : "flex-start",

                          maxWidth:
                            "70%",

                          background: mine
                            ? "var(--gradient-link)"
                            : "var(--panel-2)",

                          border: mine
                            ? "none"
                            : "1px solid var(--panel-border)",

                          borderRadius: 14,

                          padding:
                            "9px 14px",

                          fontSize:
                            "0.9rem",
                        }}
                      >
                        {m.content}
                      </div>
                    );
                  })}

                <div
                  ref={bottomRef}
                />

              </div>

              {/* ENVOI */}
              <form
                onSubmit={send}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: 14,
                  borderTop:
                    "1px solid var(--panel-border)",
                }}
              >

                <input
                  style={{
                    flex: 1,
                  }}
                  placeholder="Écrire un message..."
                  value={draft}
                  maxLength={2000}
                  onChange={(e) =>
                    setDraft(
                      e.target.value
                    )
                  }
                />

                <button
                  className="btn btn-primary"
                  disabled={!draft.trim()}
                >
                  ➤
                </button>

              </form>

            </>
          )}

        </div>

      </div>

    </div>
  );
}