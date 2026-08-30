import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../lib/api.js";

const TABS = ["Compte", "Apparence", "Notifications", "Confidentialité", "Jeu"];

const STATUS_OPTIONS = [
  { value: "online", label: "🟢 En ligne" },
  { value: "afk", label: "🟡 AFK" },
  { value: "dnd", label: "🔴 Ne pas déranger" },
  { value: "invisible", label: "⚫ Invisible" },
];

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Compte");

  const [customStatus, setCustomStatus] = useState(user?.custom_status || "");
  const [privacy, setPrivacy] = useState(
    user?.privacy || { whoCanAddMe: "everyone", whoCanMessageMe: "friends", profileVisibility: "public" }
  );
  const [notifPrefs, setNotifPrefs] = useState({ messages: true, friendRequests: true, invites: true, friendsOnline: false });
  const [autoDetect, setAutoDetect] = useState(true);

  async function changeStatus(status) {
    const { user: updated } = await api.setStatus(status);
    setUser(updated);
    showToast("✓ Statut mis à jour");
  }

  async function saveCustomStatus() {
    const { user: updated } = await api.updateProfile({ custom_status: customStatus });
    setUser(updated);
    showToast("✓ Statut personnalisé enregistré");
  }

  async function savePrivacy() {
    const { user: updated } = await api.updateProfile({ privacy });
    setUser(updated);
    showToast("✓ Confidentialité mise à jour");
  }

  async function deleteAccount() {
    if (!window.confirm("Supprimer définitivement ton compte GamerLink ? Cette action est irréversible.")) return;
    await api.deleteAccount();
    await logout();
    navigate("/connexion");
  }

  if (!user) return null;

  return (
    <div>
      <div className="page-header">
        <h1>Paramètres</h1>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? "btn btn-primary" : "btn btn-ghost"}
            style={{ padding: "8px 16px", fontSize: "0.84rem" }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 26, maxWidth: 560 }}>
        {tab === "Compte" && (
          <>
            <div className="field">
              <label>Email</label>
              <input value={user.email} disabled />
            </div>
            <div className="field">
              <label>Statut</label>
              <select value={user.status} onChange={(e) => changeStatus(e.target.value)}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Statut personnalisé</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ flex: 1 }}
                  placeholder="En train de jouer avec les potes"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                />
                <button className="btn btn-ghost" onClick={saveCustomStatus}>
                  Enregistrer
                </button>
              </div>
            </div>
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--panel-border)" }}>
              <button className="btn btn-danger" onClick={deleteAccount}>
                Supprimer mon compte
              </button>
            </div>
          </>
        )}

        {tab === "Apparence" && (
          <>
            <div className="field">
              <label>Thème</label>
              <select defaultValue="sombre">
                <option value="sombre">Sombre (par défaut)</option>
                <option value="clair" disabled>
                  Clair — bientôt disponible
                </option>
              </select>
            </div>
            <div className="field">
              <label>Couleur d'accent</label>
              <div style={{ display: "flex", gap: 10 }}>
                {["#7B2FF7", "#2F6BFF", "#B983FF"].map((c) => (
                  <div key={c} style={{ width: 30, height: 30, borderRadius: "50%", background: c, border: "2px solid var(--panel-border-strong)" }} />
                ))}
              </div>
            </div>
            <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" style={{ width: "auto" }} defaultChecked />
              <label style={{ textTransform: "none" }}>Animations discrètes</label>
            </div>
          </>
        )}

        {tab === "Notifications" && (
          <>
            {[
              ["messages", "Messages"],
              ["friendRequests", "Demandes d'amis"],
              ["invites", "Invitations"],
              ["friendsOnline", "Amis en ligne"],
            ].map(([key, label]) => (
              <div key={key} className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  style={{ width: "auto" }}
                  checked={notifPrefs[key]}
                  onChange={(e) => setNotifPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                />
                <label style={{ textTransform: "none" }}>{label}</label>
              </div>
            ))}
          </>
        )}

        {tab === "Confidentialité" && (
          <>
            <div className="field">
              <label>Qui peut m'ajouter</label>
              <select value={privacy.whoCanAddMe} onChange={(e) => setPrivacy((p) => ({ ...p, whoCanAddMe: e.target.value }))}>
                <option value="everyone">Tout le monde</option>
                <option value="friends_of_friends">Amis d'amis</option>
                <option value="nobody">Personne</option>
              </select>
            </div>
            <div className="field">
              <label>Qui peut m'envoyer des messages</label>
              <select value={privacy.whoCanMessageMe} onChange={(e) => setPrivacy((p) => ({ ...p, whoCanMessageMe: e.target.value }))}>
                <option value="everyone">Tout le monde</option>
                <option value="friends">Amis uniquement</option>
              </select>
            </div>
            <div className="field">
              <label>Visibilité du profil</label>
              <select value={privacy.profileVisibility} onChange={(e) => setPrivacy((p) => ({ ...p, profileVisibility: e.target.value }))}>
                <option value="public">Public</option>
                <option value="friends">Amis uniquement</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={savePrivacy}>
              Enregistrer
            </button>
          </>
        )}

        {tab === "Jeu" && (
          <>
            <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <input type="checkbox" style={{ width: "auto" }} checked={autoDetect} onChange={(e) => setAutoDetect(e.target.checked)} />
              <label style={{ textTransform: "none" }}>Détection automatique des jeux</label>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 10 }}>
              La détection automatique arrive en V0.2. Le statut "En jeu" peut déjà être défini manuellement depuis l'onglet Compte.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
