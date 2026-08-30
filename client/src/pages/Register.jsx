import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="glass-card auth-card">
        <div className="sidebar-logo">
          <div className="mark" />
          <span>GAMERLINK</span>
        </div>
        <h1>Rejoindre GamerLink</h1>
        <p className="sub">Trouve ta squad. Reste connecté à tes potes.</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Nom d'utilisateur</label>
            <input value={form.username} onChange={(e) => update("username", e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          </div>
          <div className="field">
            <label>Mot de passe (8 caractères min.)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <div className="auth-switch">
          Déjà inscrit ? <Link to="/connexion">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
