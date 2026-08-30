import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(identifier, password);
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
          <img
  src="/gamerlink-icon.png"
  className="sidebar-logo-img"
  alt="GamerLink"
/>
          <span>GAMERLINK</span>
        </div>
        <h1>Bon retour</h1>
        <p className="sub">Connecte-toi avant, pendant, après ta session.</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Email ou pseudo</label>
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="auth-switch">
          Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
        </div>
      </div>
    </div>
  );
}
