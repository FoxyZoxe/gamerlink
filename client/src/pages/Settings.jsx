import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../lib/api.js";

const TABS = [
  "Compte",
  "Apparence",
  "Notifications",
  "Confidentialité",
  "Jeu",
];

const STATUS_OPTIONS = [
  { value: "online", label: "🟢 En ligne" },
  { value: "afk", label: "🟡 AFK" },
  { value: "dnd", label: "🔴 Ne pas déranger" },
  { value: "invisible", label: "⚫ Invisible" },
];

const THEMES = [
  {
    id: "dark",
    name: "GamerLink",
    description: "Le thème violet classique",
    icon: "🟣",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Plus sombre et plus discret",
    icon: "🌌",
  },
  {
    id: "cyber",
    name: "Cyber",
    description: "Un style futuriste violet / cyan",
    icon: "⚡",
  },
  {
    id: "blue",
    name: "Electric Blue",
    description: "Une ambiance bleue électrique",
    icon: "🔵",
  },
];

const ACCENTS = [
  {
    id: "violet",
    name: "Violet",
    color: "#7b2ff7",
  },
  {
    id: "blue",
    name: "Bleu",
    color: "#2f6bff",
  },
  {
    id: "pink",
    name: "Rose",
    color: "#ff4fd8",
  },
  {
    id: "cyan",
    name: "Cyan",
    color: "#00d9ff",
  },
  {
    id: "green",
    name: "Vert",
    color: "#35e58a",
  },
];

function getSavedTheme() {
  return localStorage.getItem("gamerlink-theme") || "dark";
}

function getSavedAccent() {
  return localStorage.getItem("gamerlink-accent") || "violet";
}

function getSavedAnimations() {
  const saved = localStorage.getItem("gamerlink-animations");

  if (saved === null) {
    return true;
  }

  return saved === "true";
}

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState("Compte");

  const [customStatus, setCustomStatus] = useState(
    user?.custom_status || ""
  );

  const [privacy, setPrivacy] = useState(
    user?.privacy || {
      whoCanAddMe: "everyone",
      whoCanMessageMe: "friends",
      profileVisibility: "public",
    }
  );

  const [notifPrefs, setNotifPrefs] = useState({
    messages: true,
    friendRequests: true,
    invites: true,
    friendsOnline: false,
  });

  const [autoDetect, setAutoDetect] = useState(true);

  const [theme, setTheme] = useState(getSavedTheme());
  const [accent, setAccent] = useState(getSavedAccent());
  const [animations, setAnimations] = useState(
    getSavedAnimations()
  );

  // ==========================================================
  // THÈME
  // ==========================================================

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("gamerlink-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    localStorage.setItem("gamerlink-accent", accent);
  }, [accent]);

  useEffect(() => {
    document.documentElement.dataset.animations = animations
      ? "on"
      : "off";

    localStorage.setItem(
      "gamerlink-animations",
      String(animations)
    );
  }, [animations]);

  // ==========================================================
  // STATUT
  // ==========================================================

  async function changeStatus(status) {
    try {
      const { user: updated } =
        await api.setStatus(status);

      setUser(updated);

      showToast("✓ Statut mis à jour");
    } catch (error) {
      showToast(`⚠ ${error.message}`);
    }
  }

  // ==========================================================
  // STATUT PERSONNALISÉ
  // ==========================================================

  async function saveCustomStatus() {
    try {
      const { user: updated } =
        await api.updateProfile({
          custom_status: customStatus,
        });

      setUser(updated);

      showToast(
        "✓ Statut personnalisé enregistré"
      );
    } catch (error) {
      showToast(`⚠ ${error.message}`);
    }
  }

  // ==========================================================
  // CONFIDENTIALITÉ
  // ==========================================================

  async function savePrivacy() {
    try {
      const { user: updated } =
        await api.updateProfile({
          privacy,
        });

      setUser(updated);

      showToast(
        "✓ Confidentialité mise à jour"
      );
    } catch (error) {
      showToast(`⚠ ${error.message}`);
    }
  }

  // ==========================================================
  // SUPPRESSION COMPTE
  // ==========================================================

  async function deleteAccount() {
    if (
      !window.confirm(
        "Supprimer définitivement ton compte GamerLink ? Cette action est irréversible."
      )
    ) {
      return;
    }

    try {
      await api.deleteAccount();

      await logout();

      navigate("/connexion");
    } catch (error) {
      showToast(`⚠ ${error.message}`);
    }
  }

  // ==========================================================
  // DÉCONNEXION
  // ==========================================================

  async function handleLogout() {
    try {
      await logout();
      navigate("/connexion");
    } catch (error) {
      showToast(`⚠ ${error.message}`);
    }
  }

  // ==========================================================
  // CHANGEMENT THÈME
  // ==========================================================

  function changeTheme(themeId) {
    setTheme(themeId);

    const selectedTheme = THEMES.find(
      (item) => item.id === themeId
    );

    showToast(
      `✓ Thème ${selectedTheme?.name || ""} activé`
    );
  }

  // ==========================================================
  // CHANGEMENT ACCENT
  // ==========================================================

  function changeAccent(accentId) {
    setAccent(accentId);

    const selectedAccent = ACCENTS.find(
      (item) => item.id === accentId
    );

    showToast(
      `✓ Accent ${selectedAccent?.name || ""} activé`
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="page-header">
        <div className="eyebrow">
          GAMERLINK SETTINGS
        </div>

        <h1>⚙️ Paramètres</h1>

        <p>
          Personnalise ton expérience GamerLink.
        </p>
      </div>

      {/* ======================================================
          ONGLETS
      ====================================================== */}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "btn btn-primary"
                : "btn btn-ghost"
            }
            style={{
              padding: "8px 16px",
              fontSize: "0.84rem",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ======================================================
          CONTENU
      ====================================================== */}

      <div
        className="glass-card settings-card"
        style={{
          padding: 26,
          maxWidth: 700,
        }}
      >

        {/* ====================================================
            COMPTE
        ==================================================== */}

        {tab === "Compte" && (
          <>
            <div className="settings-section-title">
              <div className="eyebrow">
                COMPTE
              </div>

              <h2>
                Ton compte GamerLink
              </h2>
            </div>

            <div className="field">
              <label>Email</label>

              <input
                value={user.email}
                disabled
              />
            </div>

            <div className="field">
              <label>Statut</label>

              <select
                value={user.status}
                onChange={(e) =>
                  changeStatus(e.target.value)
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>
                Statut personnalisé
              </label>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                }}
              >
                <input
                  style={{ flex: 1 }}
                  placeholder="En train de jouer avec les potes"
                  value={customStatus}
                  maxLength={120}
                  onChange={(e) =>
                    setCustomStatus(
                      e.target.value
                    )
                  }
                />

                <button
                  className="btn btn-ghost"
                  onClick={saveCustomStatus}
                >
                  Enregistrer
                </button>
              </div>
            </div>

            {/* ZONE DANGEREUSE */}

            <div className="settings-danger-zone">
              <div>
                <div className="eyebrow">
                  ZONE DANGEREUSE
                </div>

                <p>
                  La suppression du compte est
                  définitive.
                </p>
              </div>

              <button
                className="btn btn-danger"
                onClick={deleteAccount}
              >
                Supprimer mon compte
              </button>
            </div>

            {/* DÉCONNEXION */}

            <div
              style={{
                marginTop: 20,
                paddingTop: 20,
                borderTop:
                  "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <div className="eyebrow">
                  SESSION
                </div>

                <p
                  style={{
                    margin: "6px 0 0",
                    color: "var(--muted)",
                    fontSize: "0.85rem",
                  }}
                >
                  Déconnecte-toi de ton compte
                  GamerLink sur cet appareil.
                </p>
              </div>

              <button
                className="btn btn-ghost"
                onClick={handleLogout}
              >
                🚪 Déconnexion
              </button>
            </div>
          </>
        )}

        {/* ====================================================
            APPARENCE
        ==================================================== */}

        {tab === "Apparence" && (
          <>
            <div className="settings-section-title">
              <div className="eyebrow">
                PERSONNALISATION
              </div>

              <h2>
                🎨 Apparence de GamerLink
              </h2>

              <p>
                Choisis l'ambiance qui te correspond.
              </p>
            </div>

            {/* THÈMES */}

            <div className="settings-label">
              THÈME
            </div>

            <div className="theme-grid">
              {THEMES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`theme-card ${
                    theme === item.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    changeTheme(item.id)
                  }
                >
                  <div className="theme-card-icon">
                    {item.icon}
                  </div>

                  <div className="theme-card-content">
                    <strong>
                      {item.name}
                    </strong>

                    <span>
                      {item.description}
                    </span>
                  </div>

                  {theme === item.id && (
                    <div className="theme-check">
                      ✓
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* ACCENTS */}

            <div
              className="settings-label"
              style={{ marginTop: 26 }}
            >
              COULEUR D'ACCENT
            </div>

            <div className="accent-grid">
              {ACCENTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`accent-option ${
                    accent === item.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    changeAccent(item.id)
                  }
                  title={item.name}
                >
                  <span
                    className="accent-color"
                    style={{
                      background: item.color,
                    }}
                  />

                  <span>
                    {item.name}
                  </span>

                  {accent === item.id && (
                    <span className="accent-check">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ANIMATIONS */}

            <div
              className="settings-toggle"
              style={{ marginTop: 26 }}
            >
              <div>
                <strong>
                  ✨ Animations discrètes
                </strong>

                <span>
                  Active les petites animations
                  de l'interface.
                </span>
              </div>

              <button
                type="button"
                className={`toggle ${
                  animations
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setAnimations(
                    (value) => !value
                  )
                }
                aria-label="Activer ou désactiver les animations"
              >
                <span />
              </button>
            </div>
          </>
        )}

        {/* ====================================================
            NOTIFICATIONS
        ==================================================== */}

        {tab === "Notifications" && (
          <>
            <div className="settings-section-title">
              <div className="eyebrow">
                NOTIFICATIONS
              </div>

              <h2>
                🔔 Tes notifications
              </h2>
            </div>

            {[
              ["messages", "💬 Messages"],
              [
                "friendRequests",
                "👥 Demandes d'amis",
              ],
              ["invites", "🎮 Invitations"],
              [
                "friendsOnline",
                "🟢 Amis en ligne",
              ],
            ].map(([key, label]) => (
              <div
                key={key}
                className="settings-toggle"
              >
                <div>
                  <strong>
                    {label}
                  </strong>
                </div>

                <button
                  type="button"
                  className={`toggle ${
                    notifPrefs[key]
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setNotifPrefs((prefs) => ({
                      ...prefs,
                      [key]: !prefs[key],
                    }))
                  }
                >
                  <span />
                </button>
              </div>
            ))}
          </>
        )}

        {/* ====================================================
            CONFIDENTIALITÉ
        ==================================================== */}

        {tab === "Confidentialité" && (
          <>
            <div className="settings-section-title">
              <div className="eyebrow">
                PRIVACY
              </div>

              <h2>
                🔒 Confidentialité
              </h2>
            </div>

            <div className="field">
              <label>
                Qui peut m'ajouter
              </label>

              <select
                value={privacy.whoCanAddMe}
                onChange={(e) =>
                  setPrivacy((p) => ({
                    ...p,
                    whoCanAddMe:
                      e.target.value,
                  }))
                }
              >
                <option value="everyone">
                  Tout le monde
                </option>

                <option value="friends_of_friends">
                  Amis d'amis
                </option>

                <option value="nobody">
                  Personne
                </option>
              </select>
            </div>

            <div className="field">
              <label>
                Qui peut m'envoyer des messages
              </label>

              <select
                value={
                  privacy.whoCanMessageMe
                }
                onChange={(e) =>
                  setPrivacy((p) => ({
                    ...p,
                    whoCanMessageMe:
                      e.target.value,
                  }))
                }
              >
                <option value="everyone">
                  Tout le monde
                </option>

                <option value="friends">
                  Amis uniquement
                </option>
              </select>
            </div>

            <div className="field">
              <label>
                Visibilité du profil
              </label>

              <select
                value={
                  privacy.profileVisibility
                }
                onChange={(e) =>
                  setPrivacy((p) => ({
                    ...p,
                    profileVisibility:
                      e.target.value,
                  }))
                }
              >
                <option value="public">
                  Public
                </option>

                <option value="friends">
                  Amis uniquement
                </option>
              </select>
            </div>

            <button
              className="btn btn-primary"
              onClick={savePrivacy}
            >
              ✓ Enregistrer
            </button>
          </>
        )}

        {/* ====================================================
            JEU
        ==================================================== */}

        {tab === "Jeu" && (
          <>
            <div className="settings-section-title">
              <div className="eyebrow">
                GAMING
              </div>

              <h2>
                🎮 Détection des jeux
              </h2>
            </div>

            <div className="settings-toggle">
              <div>
                <strong>
                  Détection automatique
                </strong>

                <span>
                  Détecte automatiquement les
                  jeux lancés sur ton PC.
                </span>
              </div>

              <button
                type="button"
                className={`toggle ${
                  autoDetect
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setAutoDetect(
                    (value) => !value
                  )
                }
              >
                <span />
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}