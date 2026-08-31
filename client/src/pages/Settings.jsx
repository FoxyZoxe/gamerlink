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
  "Son & Micro",
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

const DEFAULT_AUDIO_SETTINGS = {
  microphoneId: "",
  outputDeviceId: "",
  micVolume: 100,
  outputVolume: 100,
  voiceDetection: true,
  sensitivity: 35,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
};

function getSavedTheme() {
  return localStorage.getItem("gamerlink-theme") || "dark";
}

function getSavedAccent() {
  return localStorage.getItem("gamerlink-accent") || "violet";
}

function getSavedAnimations() {
  const saved = localStorage.getItem(
    "gamerlink-animations"
  );

  if (saved === null) {
    return true;
  }

  return saved === "true";
}

function getSavedAudioSettings() {
  try {
    const saved = localStorage.getItem(
      "gamerlink-audio-settings"
    );

    if (!saved) {
      return DEFAULT_AUDIO_SETTINGS;
    }

    return {
      ...DEFAULT_AUDIO_SETTINGS,
      ...JSON.parse(saved),
    };
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState("Compte");

  const [customStatus, setCustomStatus] =
    useState(user?.custom_status || "");

  const [privacy, setPrivacy] = useState(
    user?.privacy || {
      whoCanAddMe: "everyone",
      whoCanMessageMe: "friends",
      profileVisibility: "public",
    }
  );

  const [notifPrefs, setNotifPrefs] =
    useState({
      messages: true,
      friendRequests: true,
      invites: true,
      friendsOnline: false,
    });

  const [autoDetect, setAutoDetect] =
    useState(true);

  const [theme, setTheme] =
    useState(getSavedTheme());

  const [accent, setAccent] =
    useState(getSavedAccent());

  const [animations, setAnimations] =
    useState(getSavedAnimations());

  const [audioSettings, setAudioSettings] =
    useState(getSavedAudioSettings());

  const [audioInputs, setAudioInputs] =
    useState([]);

  const [audioOutputs, setAudioOutputs] =
    useState([]);

  const [micTesting, setMicTesting] =
    useState(false);

  const [micLevel, setMicLevel] =
    useState(0);

  const [micTestStream, setMicTestStream] =
    useState(null);

  const [micTestAnimation, setMicTestAnimation] =
    useState(null);

  // ==========================================================
  // THÈME
  // ==========================================================

  useEffect(() => {
    document.documentElement.dataset.theme =
      theme;

    localStorage.setItem(
      "gamerlink-theme",
      theme
    );
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.accent =
      accent;

    localStorage.setItem(
      "gamerlink-accent",
      accent
    );
  }, [accent]);

  useEffect(() => {
    document.documentElement.dataset.animations =
      animations ? "on" : "off";

    localStorage.setItem(
      "gamerlink-animations",
      String(animations)
    );
  }, [animations]);

  // ==========================================================
  // AUDIO
  // ==========================================================

  useEffect(() => {
    localStorage.setItem(
      "gamerlink-audio-settings",
      JSON.stringify(audioSettings)
    );

    window.dispatchEvent(
      new CustomEvent(
        "gamerlink-audio-settings-changed",
        {
          detail: audioSettings,
        }
      )
    );
  }, [audioSettings]);

  // ==========================================================
  // CHARGER LES PÉRIPHÉRIQUES AUDIO
  // ==========================================================

  async function loadAudioDevices() {
    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.enumerateDevices
    ) {
      return;
    }

    try {
      const devices =
        await navigator.mediaDevices.enumerateDevices();

      const inputs = devices.filter(
        (device) =>
          device.kind ===
          "audioinput"
      );

      const outputs = devices.filter(
        (device) =>
          device.kind ===
          "audiooutput"
      );

      setAudioInputs(inputs);
      setAudioOutputs(outputs);
    } catch (error) {
      console.error(
        "❌ Impossible de récupérer les périphériques audio :",
        error
      );
    }
  }

  useEffect(() => {
    loadAudioDevices();

    if (
      navigator.mediaDevices?.addEventListener
    ) {
      navigator.mediaDevices.addEventListener(
        "devicechange",
        loadAudioDevices
      );

      return () => {
        navigator.mediaDevices.removeEventListener(
          "devicechange",
          loadAudioDevices
        );
      };
    }
  }, []);

  // ==========================================================
  // TEST MICROPHONE
  // ==========================================================

  async function startMicTest() {
    if (micTesting) {
      stopMicTest();
      return;
    }

    try {
      const constraints = {
        audio: {
          ...(audioSettings.microphoneId
            ? {
                deviceId: {
                  exact:
                    audioSettings.microphoneId,
                },
              }
            : {}),
          echoCancellation:
            audioSettings.echoCancellation,
          noiseSuppression:
            audioSettings.noiseSuppression,
          autoGainControl:
            audioSettings.autoGainControl,
        },
        video: false,
      };

      const stream =
        await navigator.mediaDevices.getUserMedia(
          constraints
        );

      setMicTestStream(stream);
      setMicTesting(true);

      const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      const context =
        new AudioContextClass();

      const source =
        context.createMediaStreamSource(
          stream
        );

      const analyser =
        context.createAnalyser();

      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;

      source.connect(analyser);

      const data =
        new Uint8Array(
          analyser.fftSize
        );

      const detect = () => {
        if (!stream.active) {
          return;
        }

        analyser.getByteTimeDomainData(
          data
        );

        let sum = 0;

        for (let i = 0; i < data.length; i++) {
          const value =
            (data[i] - 128) / 128;

          sum += value * value;
        }

        const volume =
          Math.sqrt(
            sum / data.length
          );

        const level = Math.min(
          100,
          Math.round(volume * 500)
        );

        setMicLevel(level);

        const animation =
          requestAnimationFrame(
            detect
          );

        setMicTestAnimation(animation);
      };

      detect();

      showToast("🎤 Test microphone activé");
    } catch (error) {
      console.error(
        "❌ Test microphone :",
        error
      );

      if (
        error?.name ===
        "NotAllowedError"
      ) {
        showToast(
          "⚠️ Autorise l'accès au microphone."
        );
      } else {
        showToast(
          "⚠️ Impossible de tester le microphone."
        );
      }
    }
  }

  function stopMicTest() {
    if (micTestAnimation) {
      cancelAnimationFrame(
        micTestAnimation
      );
    }

    if (micTestStream) {
      micTestStream
        .getTracks()
        .forEach((track) => {
          track.stop();
        });
    }

    setMicTestAnimation(null);
    setMicTestStream(null);
    setMicTesting(false);
    setMicLevel(0);
  }

  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  // ==========================================================
  // STATUT
  // ==========================================================

  async function changeStatus(status) {
    try {
      const { user: updated } =
        await api.setStatus(status);

      setUser(updated);

      showToast(
        "✓ Statut mis à jour"
      );
    } catch (error) {
      showToast(
        `⚠ ${error.message}`
      );
    }
  }

  // ==========================================================
  // STATUT PERSONNALISÉ
  // ==========================================================

  async function saveCustomStatus() {
    try {
      const { user: updated } =
        await api.updateProfile({
          custom_status:
            customStatus,
        });

      setUser(updated);

      showToast(
        "✓ Statut personnalisé enregistré"
      );
    } catch (error) {
      showToast(
        `⚠ ${error.message}`
      );
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
      showToast(
        `⚠ ${error.message}`
      );
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
      showToast(
        `⚠ ${error.message}`
      );
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
      showToast(
        `⚠ ${error.message}`
      );
    }
  }

  // ==========================================================
  // CHANGEMENT THÈME
  // ==========================================================

  function changeTheme(themeId) {
    setTheme(themeId);

    const selectedTheme =
      THEMES.find(
        (item) =>
          item.id === themeId
      );

    showToast(
      `✓ Thème ${
        selectedTheme?.name || ""
      } activé`
    );
  }

  // ==========================================================
  // CHANGEMENT ACCENT
  // ==========================================================

  function changeAccent(accentId) {
    setAccent(accentId);

    const selectedAccent =
      ACCENTS.find(
        (item) =>
          item.id === accentId
      );

    showToast(
      `✓ Accent ${
        selectedAccent?.name || ""
      } activé`
    );
  }

  // ==========================================================
  // AUDIO SETTER
  // ==========================================================

  function updateAudioSetting(
    key,
    value
  ) {
    setAudioSettings(
      (previous) => ({
        ...previous,
        [key]: value,
      })
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
              padding:
                "8px 16px",
              fontSize:
                "0.84rem",
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
              <label>
                Email
              </label>

              <input
                value={
                  user.email
                }
                disabled
              />
            </div>

            <div className="field">
              <label>
                Statut
              </label>

              <select
                value={
                  user.status
                }
                onChange={(e) =>
                  changeStatus(
                    e.target.value
                  )
                }
              >
                {STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="field">
              <label>
                Statut personnalisé
              </label>

              <div
                style={{
                  display:
                    "flex",
                  gap: 8,
                }}
              >
                <input
                  style={{
                    flex: 1,
                  }}
                  placeholder="En train de jouer avec les potes"
                  value={
                    customStatus
                  }
                  maxLength={120}
                  onChange={(e) =>
                    setCustomStatus(
                      e.target.value
                    )
                  }
                />

                <button
                  className="btn btn-ghost"
                  onClick={
                    saveCustomStatus
                  }
                >
                  Enregistrer
                </button>
              </div>
            </div>

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
                onClick={
                  deleteAccount
                }
              >
                Supprimer mon compte
              </button>
            </div>

            <div
              style={{
                marginTop: 20,
                paddingTop: 20,
                borderTop:
                  "1px solid var(--border)",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: 16,
              }}
            >
              <div>
                <div className="eyebrow">
                  SESSION
                </div>

                <p
                  style={{
                    margin:
                      "6px 0 0",
                    color:
                      "var(--muted)",
                    fontSize:
                      "0.85rem",
                  }}
                >
                  Déconnecte-toi de ton compte
                  GamerLink sur cet appareil.
                </p>
              </div>

              <button
                className="btn btn-ghost"
                onClick={
                  handleLogout
                }
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

            <div className="settings-label">
              THÈME
            </div>

            <div className="theme-grid">
              {THEMES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`theme-card ${
                    theme ===
                    item.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    changeTheme(
                      item.id
                    )
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
                      {
                        item.description
                      }
                    </span>
                  </div>

                  {theme ===
                    item.id && (
                    <div className="theme-check">
                      ✓
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div
              className="settings-label"
              style={{
                marginTop: 26,
              }}
            >
              COULEUR D'ACCENT
            </div>

            <div className="accent-grid">
              {ACCENTS.map(
                (item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`accent-option ${
                      accent ===
                      item.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      changeAccent(
                        item.id
                      )
                    }
                    title={
                      item.name
                    }
                  >
                    <span
                      className="accent-color"
                      style={{
                        background:
                          item.color,
                      }}
                    />

                    <span>
                      {item.name}
                    </span>

                    {accent ===
                      item.id && (
                      <span className="accent-check">
                        ✓
                      </span>
                    )}
                  </button>
                )
              )}
            </div>

            <div
              className="settings-toggle"
              style={{
                marginTop: 26,
              }}
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
                    (value) =>
                      !value
                  )
                }
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
              [
                "messages",
                "💬 Messages",
              ],
              [
                "friendRequests",
                "👥 Demandes d'amis",
              ],
              [
                "invites",
                "🎮 Invitations",
              ],
              [
                "friendsOnline",
                "🟢 Amis en ligne",
              ],
            ].map(
              ([key, label]) => (
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
                      notifPrefs[
                        key
                      ]
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setNotifPrefs(
                        (prefs) => ({
                          ...prefs,
                          [key]:
                            !prefs[
                              key
                            ],
                        })
                      )
                    }
                  >
                    <span />
                  </button>
                </div>
              )
            )}
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
                value={
                  privacy.whoCanAddMe
                }
                onChange={(e) =>
                  setPrivacy(
                    (p) => ({
                      ...p,
                      whoCanAddMe:
                        e.target
                          .value,
                    })
                  )
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
                  setPrivacy(
                    (p) => ({
                      ...p,
                      whoCanMessageMe:
                        e.target
                          .value,
                    })
                  )
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
                  setPrivacy(
                    (p) => ({
                      ...p,
                      profileVisibility:
                        e.target
                          .value,
                    })
                  )
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
              onClick={
                savePrivacy
              }
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
                    (value) =>
                      !value
                  )
                }
              >
                <span />
              </button>
            </div>
          </>
        )}

        {/* ====================================================
            SON & MICRO
        ==================================================== */}

        {tab === "Son & Micro" && (
          <>
            <div className="settings-section-title">
              <div className="eyebrow">
                AUDIO
              </div>

              <h2>
                🎙️ Son & Micro
              </h2>

              <p>
                Configure ton microphone et ton
                audio vocal GamerLink.
              </p>
            </div>

            {/* MICROPHONE */}

            <div className="field">
              <label>
                🎤 Microphone
              </label>

              <select
                value={
                  audioSettings.microphoneId
                }
                onChange={(e) =>
                  updateAudioSetting(
                    "microphoneId",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Microphone par défaut
                </option>

                {audioInputs.map(
                  (device, index) => (
                    <option
                      key={
                        device.deviceId ||
                        index
                      }
                      value={
                        device.deviceId
                      }
                    >
                      {device.label ||
                        `Microphone ${index + 1}`}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* SORTIE */}

            <div className="field">
              <label>
                🔊 Sortie audio
              </label>

              <select
                value={
                  audioSettings.outputDeviceId
                }
                onChange={(e) =>
                  updateAudioSetting(
                    "outputDeviceId",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Sortie audio par défaut
                </option>

                {audioOutputs.map(
                  (device, index) => (
                    <option
                      key={
                        device.deviceId ||
                        index
                      }
                      value={
                        device.deviceId
                      }
                    >
                      {device.label ||
                        `Sortie audio ${index + 1}`}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* VOLUME MICRO */}

            <div
              className="field"
              style={{
                marginTop: 20,
              }}
            >
              <label>
                🎚️ Volume du microphone
              </label>

              <input
                type="range"
                min="0"
                max="200"
                value={
                  audioSettings.micVolume
                }
                onChange={(e) =>
                  updateAudioSetting(
                    "micVolume",
                    Number(
                      e.target.value
                    )
                  )
                }
              />

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  color:
                    "var(--muted)",
                  fontSize:
                    "0.8rem",
                  marginTop: 4,
                }}
              >
                <span>
                  0%
                </span>

                <strong>
                  {
                    audioSettings.micVolume
                  }
                  %
                </strong>

                <span>
                  200%
                </span>
              </div>
            </div>

            {/* VOLUME SORTIE */}

            <div className="field">
              <label>
                🔊 Volume du vocal
              </label>

              <input
                type="range"
                min="0"
                max="200"
                value={
                  audioSettings.outputVolume
                }
                onChange={(e) =>
                  updateAudioSetting(
                    "outputVolume",
                    Number(
                      e.target.value
                    )
                  )
                }
              />

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  color:
                    "var(--muted)",
                  fontSize:
                    "0.8rem",
                  marginTop: 4,
                }}
              >
                <span>
                  0%
                </span>

                <strong>
                  {
                    audioSettings.outputVolume
                  }
                  %
                </strong>

                <span>
                  200%
                </span>
              </div>
            </div>

            {/* TEST MICRO */}

            <div
              style={{
                marginTop: 24,
                padding: 16,
                border:
                  "1px solid var(--border)",
                borderRadius: 14,
                background:
                  "rgba(255,255,255,0.025)",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: 12,
                }}
              >
                <div>
                  <strong>
                    🧪 Tester le microphone
                  </strong>

                  <p
                    style={{
                      margin:
                        "5px 0 0",
                      color:
                        "var(--muted)",
                      fontSize:
                        "0.8rem",
                    }}
                  >
                    Parle pour vérifier le niveau
                    de ton microphone.
                  </p>
                </div>

                <button
                  className={
                    micTesting
                      ? "btn btn-danger"
                      : "btn btn-ghost"
                  }
                  onClick={
                    startMicTest
                  }
                >
                  {micTesting
                    ? "⏹ Arrêter"
                    : "🎤 Tester"}
                </button>
              </div>

              {micTesting && (
                <div
                  style={{
                    marginTop: 14,
                  }}
                >
                  <div
                    style={{
                      height: 10,
                      width: "100%",
                      borderRadius: 99,
                      overflow:
                        "hidden",
                      background:
                        "rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        width: `${micLevel}%`,
                        height: "100%",
                        borderRadius: 99,
                        background:
                          "var(--accent, #7b2ff7)",
                        transition:
                          "width 0.08s linear",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      color:
                        "var(--muted)",
                      fontSize:
                        "0.75rem",
                    }}
                  >
                    Niveau :{" "}
                    {micLevel}%
                  </div>
                </div>
              )}
            </div>

            {/* DÉTECTION */}

            <div
              className="settings-toggle"
              style={{
                marginTop: 24,
              }}
            >
              <div>
                <strong>
                  🗣️ Détection de voix
                </strong>

                <span>
                  Détecte automatiquement quand tu
                  parles.
                </span>
              </div>

              <button
                type="button"
                className={`toggle ${
                  audioSettings.voiceDetection
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  updateAudioSetting(
                    "voiceDetection",
                    !audioSettings.voiceDetection
                  )
                }
              >
                <span />
              </button>
            </div>

            {/* SENSIBILITÉ */}

            <div className="field">
              <label>
                🎚️ Sensibilité de détection
              </label>

              <input
                type="range"
                min="5"
                max="100"
                value={
                  audioSettings.sensitivity
                }
                disabled={
                  !audioSettings.voiceDetection
                }
                onChange={(e) =>
                  updateAudioSetting(
                    "sensitivity",
                    Number(
                      e.target.value
                    )
                  )
                }
              />

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  color:
                    "var(--muted)",
                  fontSize:
                    "0.8rem",
                }}
              >
                <span>
                  Peu sensible
                </span>

                <strong>
                  {
                    audioSettings.sensitivity
                  }
                  %
                </strong>

                <span>
                  Très sensible
                </span>
              </div>
            </div>

            {/* SUPPRESSION BRUIT */}

            <div className="settings-toggle">
              <div>
                <strong>
                  🔇 Suppression du bruit
                </strong>

                <span>
                  Réduit les bruits de fond du
                  microphone.
                </span>
              </div>

              <button
                type="button"
                className={`toggle ${
                  audioSettings.noiseSuppression
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  updateAudioSetting(
                    "noiseSuppression",
                    !audioSettings.noiseSuppression
                  )
                }
              >
                <span />
              </button>
            </div>

            {/* ECHO */}

            <div className="settings-toggle">
              <div>
                <strong>
                  ↩️ Annulation d'écho
                </strong>

                <span>
                  Évite que les autres entendent
                  leur propre voix.
                </span>
              </div>

              <button
                type="button"
                className={`toggle ${
                  audioSettings.echoCancellation
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  updateAudioSetting(
                    "echoCancellation",
                    !audioSettings.echoCancellation
                  )
                }
              >
                <span />
              </button>
            </div>

            {/* GAIN */}

            <div className="settings-toggle">
              <div>
                <strong>
                  ⚡ Gain automatique
                </strong>

                <span>
                  Ajuste automatiquement le niveau
                  du microphone.
                </span>
              </div>

              <button
                type="button"
                className={`toggle ${
                  audioSettings.autoGainControl
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  updateAudioSetting(
                    "autoGainControl",
                    !audioSettings.autoGainControl
                  )
                }
              >
                <span />
              </button>
            </div>

            <div
              style={{
                marginTop: 20,
                padding: 12,
                borderRadius: 10,
                background:
                  "rgba(123,47,247,0.08)",
                color:
                  "var(--muted)",
                fontSize:
                  "0.78rem",
              }}
            >
              💾 Les paramètres audio sont
              automatiquement sauvegardés sur cet
              appareil.
            </div>
          </>
        )}
      </div>
    </div>
  );
}