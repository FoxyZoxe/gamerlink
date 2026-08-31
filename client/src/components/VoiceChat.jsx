import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "https://gamerlink.onrender.com";

export default function VoiceChat({ squadId, user }) {
  // ==========================================================
  // REFS
  // ==========================================================

  const socketRef = useRef(null);
  const localStreamRef = useRef(null);

  const peersRef = useRef(new Map());
  const audioRefs = useRef(new Map());

  // Détection de voix
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const voiceAnimationRef = useRef(null);

  const speakingRef = useRef(false);
  const mutedRef = useRef(false);

  // Évite les problèmes de synchronisation React
  const voiceUsersRef = useRef([]);

  // ==========================================================
  // ÉTATS
  // ==========================================================

  const [speakingUsers, setSpeakingUsers] = useState(new Set());
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");

  // ==========================================================
  // UTILITAIRE — METTRE À JOUR LES UTILISATEURS
  // ==========================================================

  function updateVoiceUsers(updater) {
    setVoiceUsers((previous) => {
      const next =
        typeof updater === "function"
          ? updater(previous)
          : updater;

      voiceUsersRef.current = next;

      return next;
    });
  }

  // ==========================================================
  // ARRÊTER LA DÉTECTION DE VOIX
  // ==========================================================

  function stopVoiceDetection() {
    if (voiceAnimationRef.current) {
      cancelAnimationFrame(
        voiceAnimationRef.current
      );

      voiceAnimationRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {}

      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}

      audioContextRef.current = null;
    }

    speakingRef.current = false;

    setSpeaking(false);

    console.log(
      "🔇 Détection de voix arrêtée"
    );
  }

  // ==========================================================
  // DÉMARRER LA DÉTECTION DE VOIX
  // ==========================================================

  function startVoiceDetection(stream, socket) {
    try {
      if (!stream || !socket) {
        return null;
      }

      stopVoiceDetection();

      const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContextClass) {
        console.warn(
          "⚠️ AudioContext non disponible."
        );

        return null;
      }

      const audioContext =
        new AudioContextClass();

      const analyser =
        audioContext.createAnalyser();

      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.85;

      const source =
        audioContext.createMediaStreamSource(
          stream
        );

      source.connect(analyser);

      audioContextRef.current =
        audioContext;

      analyserRef.current =
        analyser;

      if (
        audioContext.state ===
        "suspended"
      ) {
        audioContext
          .resume()
          .catch(() => {});
      }

      const data =
        new Uint8Array(
          analyser.fftSize
        );

      let lastVoiceTime = 0;

      const START_THRESHOLD = 0.035;
      const STOP_THRESHOLD = 0.020;
      const SILENCE_DELAY = 350;

      const detect = () => {
        if (
          !analyserRef.current ||
          !localStreamRef.current
        ) {
          return;
        }

        analyser.getByteTimeDomainData(
          data
        );

        let sum = 0;

        for (
          let i = 0;
          i < data.length;
          i++
        ) {
          const value =
            (data[i] - 128) / 128;

          sum += value * value;
        }

        const volume =
          Math.sqrt(
            sum / data.length
          );

        const now =
          performance.now();

        // ======================================================
        // MICRO COUPÉ
        // ======================================================

        if (mutedRef.current) {
          if (speakingRef.current) {
            speakingRef.current =
              false;

            setSpeaking(false);

            socket.emit(
              "voice:speaking",
              {
                squadId,
                speaking: false,
              }
            );

            console.log(
              "🔇 Parole arrêtée car micro coupé"
            );
          }

          voiceAnimationRef.current =
            requestAnimationFrame(
              detect
            );

          return;
        }

        // ======================================================
        // DÉBUT DE PAROLE
        // ======================================================

        if (
          volume >=
          START_THRESHOLD
        ) {
          lastVoiceTime = now;

          if (
            !speakingRef.current
          ) {
            speakingRef.current =
              true;

            setSpeaking(true);

            console.log(
              "🎙️ TU PARLES → envoi serveur"
            );

            socket.emit(
              "voice:speaking",
              {
                squadId,
                speaking: true,
              }
            );
          }
        }

        // ======================================================
        // FIN DE PAROLE
        // ======================================================

        else if (
          speakingRef.current &&
          volume <
            STOP_THRESHOLD &&
          now - lastVoiceTime >
            SILENCE_DELAY
        ) {
          speakingRef.current =
            false;

          setSpeaking(false);

          console.log(
            "🔇 TU NE PARLES PLUS → envoi serveur"
          );

          socket.emit(
            "voice:speaking",
            {
              squadId,
              speaking: false,
            }
          );
        }

        voiceAnimationRef.current =
          requestAnimationFrame(
            detect
          );
      };

      detect();

      console.log(
        "🎙️ Détection de voix activée"
      );

      return () => {
        if (
          voiceAnimationRef.current
        ) {
          cancelAnimationFrame(
            voiceAnimationRef.current
          );

          voiceAnimationRef.current =
            null;
        }

        try {
          source.disconnect();
        } catch {}

        try {
          analyser.disconnect();
        } catch {}

        try {
          audioContext.close();
        } catch {}

        if (
          audioContextRef.current ===
          audioContext
        ) {
          audioContextRef.current =
            null;
        }

        if (
          analyserRef.current ===
          analyser
        ) {
          analyserRef.current =
            null;
        }

        speakingRef.current =
          false;

        setSpeaking(false);
      };
    } catch (error) {
      console.error(
        "❌ Erreur détection voix :",
        error
      );

      return null;
    }
  }

  // ==========================================================
  // NETTOYAGE PEER
  // ==========================================================

  function cleanupPeer(socketId) {
    const peer =
      peersRef.current.get(
        socketId
      );

    if (peer) {
      try {
        peer.close();
      } catch {}

      peersRef.current.delete(
        socketId
      );
    }

    const audio =
      audioRefs.current.get(
        socketId
      );

    if (audio) {
      try {
        audio.pause();
      } catch {}

      audio.srcObject = null;
      audio.remove();

      audioRefs.current.delete(
        socketId
      );
    }

    setSpeakingUsers(
      (previous) => {
        const next =
          new Set(previous);

        next.delete(socketId);

        return next;
      }
    );

    updateVoiceUsers(
      (previous) =>
        previous.filter(
          (item) =>
            item.socketId !==
            socketId
        )
    );
  }

  // ==========================================================
  // NETTOYAGE COMPLET
  // ==========================================================

  function cleanupVoice() {
    if (
      socketRef.current
    ) {
      try {
        socketRef.current.emit(
          "voice:speaking",
          {
            squadId,
            speaking: false,
          }
        );
      } catch {}
    }

    stopVoiceDetection();

    peersRef.current.forEach(
      (peer) => {
        try {
          peer.close();
        } catch {}
      }
    );

    peersRef.current.clear();

    audioRefs.current.forEach(
      (audio) => {
        try {
          audio.pause();
        } catch {}

        audio.srcObject = null;
        audio.remove();
      }
    );

    audioRefs.current.clear();

    if (
      localStreamRef.current
    ) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => {
          try {
            track.stop();
          } catch {}
        });

      localStreamRef.current =
        null;
    }

    if (
      socketRef.current
    ) {
      try {
        socketRef.current.disconnect();
      } catch {}

      socketRef.current =
        null;
    }

    voiceUsersRef.current = [];

    setVoiceUsers([]);

    setSpeakingUsers(
      new Set()
    );

    setConnected(false);
    setSpeaking(false);

    speakingRef.current =
      false;

    mutedRef.current =
      false;
  }

  // ==========================================================
  // CRÉATION PEER WEBRTC
  // ==========================================================

  async function createPeer(
    socketId,
    initiator
  ) {
    if (
      !socketRef.current ||
      !socketId
    ) {
      return null;
    }

    if (
      peersRef.current.has(
        socketId
      )
    ) {
      return peersRef.current.get(
        socketId
      );
    }

    const peer =
      new RTCPeerConnection({
        iceServers: [
          {
            urls:
              "stun:stun.l.google.com:19302",
          },
          {
            urls:
              "stun:stun1.l.google.com:19302",
          },
        ],
      });

    peersRef.current.set(
      socketId,
      peer
    );

    // ========================================================
    // MICRO LOCAL
    // ========================================================

    if (
      localStreamRef.current
    ) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => {
          peer.addTrack(
            track,
            localStreamRef.current
          );
        });
    }

    // ========================================================
    // AUDIO DISTANT
    // ========================================================

    peer.ontrack = (event) => {
      const stream =
        event.streams?.[0];

      if (!stream) {
        return;
      }

      let audio =
        audioRefs.current.get(
          socketId
        );

      if (!audio) {
        audio =
          document.createElement(
            "audio"
          );

        audio.autoplay = true;
        audio.playsInline = true;
        audio.controls = false;
        audio.style.display =
          "none";

        document.body.appendChild(
          audio
        );

        audioRefs.current.set(
          socketId,
          audio
        );
      }

      audio.srcObject =
        stream;

      audio.muted =
        deafened;

      audio
        .play()
        .catch(() => {
          console.warn(
            "⚠️ Lecture audio bloquée."
          );
        });
    };

    // ========================================================
    // ICE
    // ========================================================

    peer.onicecandidate = (
      event
    ) => {
      if (
        !event.candidate ||
        !socketRef.current
      ) {
        return;
      }

      socketRef.current.emit(
        "voice:ice-candidate",
        {
          target: socketId,
          candidate:
            event.candidate,
        }
      );
    };

    // ========================================================
    // ÉTAT WEBRTC
    // ========================================================

    peer.onconnectionstatechange =
      () => {
        console.log(
          "🔗 WebRTC",
          socketId,
          peer.connectionState
        );

        if (
          peer.connectionState ===
            "failed" ||
          peer.connectionState ===
            "closed"
        ) {
          cleanupPeer(
            socketId
          );
        }
      };

    // ========================================================
    // OFFER
    // ========================================================

    if (initiator) {
      try {
        const offer =
          await peer.createOffer();

        await peer.setLocalDescription(
          offer
        );

        if (
          socketRef.current
        ) {
          socketRef.current.emit(
            "voice:offer",
            {
              target: socketId,
              offer,
            }
          );
        }
      } catch (error) {
        console.error(
          "❌ Erreur création offer :",
          error
        );
      }
    }

    return peer;
  }

  // ==========================================================
  // REJOINDRE LE VOCAL
  // ==========================================================

  async function joinVoice() {
    try {
      setError("");

      if (!squadId) {
        setError(
          "Impossible de rejoindre ce vocal."
        );

        return;
      }

      if (!user) {
        setError(
          "Utilisateur non connecté."
        );

        return;
      }

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices
          .getUserMedia
      ) {
        setError(
          "Le microphone n'est pas disponible."
        );

        return;
      }

      if (
        socketRef.current ||
        localStreamRef.current
      ) {
        cleanupVoice();
      }

      console.log(
        "🎤 Demande microphone..."
      );

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          }
        );

      localStreamRef.current =
        stream;

      console.log(
        "🎤 Microphone activé"
      );

      // ======================================================
      // SOCKET.IO
      // ======================================================

      const socket =
        io(
          SOCKET_URL,
          {
            transports: [
              "polling",
              "websocket",
            ],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
          }
        );

      socketRef.current =
        socket;

      // ======================================================
      // CONNEXION
      // ======================================================

      socket.on(
        "connect",
        () => {
          console.log(
            "🎙️ Connecté au serveur vocal"
          );

          console.log(
            "🆔 Socket ID :",
            socket.id
          );

          console.log(
            "🏠 Squad ID :",
            squadId
          );

          setConnected(true);

          startVoiceDetection(
            stream,
            socket
          );

          socket.emit(
            "voice:join",
            {
              squadId,
              user: {
                id: user.id,
                username:
                  user.username ||
                  user.name ||
                  "Joueur",
                avatar:
                  user.avatar ||
                  user.avatar_url ||
                  null,
              },
            }
          );
        }
      );

      // ======================================================
      // UTILISATEURS DÉJÀ PRÉSENTS
      // ======================================================

      socket.on(
        "voice:users",
        async (users) => {
          if (
            !Array.isArray(users)
          ) {
            return;
          }

          console.log(
            "👥 Joueurs présents :",
            users
          );

          const normalizedUsers =
            users.map(
              (item) => ({
                ...item,
                speaking:
                  Boolean(
                    item.speaking
                  ),
              })
            );

          voiceUsersRef.current =
            normalizedUsers;

          setVoiceUsers(
            normalizedUsers
          );

          setSpeakingUsers(
            new Set(
              normalizedUsers
                .filter(
                  (item) =>
                    item.speaking
                )
                .map(
                  (item) =>
                    item.socketId
                )
            )
          );

          for (
            const item of normalizedUsers
          ) {
            if (
              item.socketId
            ) {
              await createPeer(
                item.socketId,
                true
              );
            }
          }
        }
      );

      // ======================================================
      // NOUVEAU JOUEUR
      // ======================================================

      socket.on(
        "voice:user-joined",
        ({
          socketId,
          user: joinedUser,
          speaking:
            joinedSpeaking,
        }) => {
          if (!socketId) {
            return;
          }

          console.log(
            "🎙️ NOUVEAU JOUEUR :",
            socketId,
            joinedUser
          );

          updateVoiceUsers(
            (previous) => {
              const existing =
                previous.find(
                  (item) =>
                    item.socketId ===
                    socketId
                );

              if (existing) {
                return previous.map(
                  (item) =>
                    item.socketId ===
                    socketId
                      ? {
                          ...item,
                          user:
                            joinedUser ||
                            item.user,
                          speaking:
                            Boolean(
                              joinedSpeaking
                            ),
                        }
                      : item
                );
              }

              return [
                ...previous,
                {
                  socketId,
                  user:
                    joinedUser,
                  speaking:
                    Boolean(
                      joinedSpeaking
                    ),
                },
              ];
            }
          );

          setSpeakingUsers(
            (previous) => {
              const next =
                new Set(previous);

              if (
                joinedSpeaking
              ) {
                next.add(
                  socketId
                );
              } else {
                next.delete(
                  socketId
                );
              }

              return next;
            }
          );
        }
      );

      // ======================================================
      // ⭐ JOUEUR PARLE
      // ======================================================

      socket.on(
        "voice:user-speaking",
        ({
          socketId,
          speaking:
            isSpeaking,
        }) => {
          if (!socketId) {
            return;
          }

          const speakingNow =
            Boolean(
              isSpeaking
            );

          console.log(
            "🎙️ ⭐ ÉTAT PAROLE REÇU :",
            {
              socketId,
              speaking:
                speakingNow,
            }
          );

          // ==================================================
          // MISE À JOUR DU SET
          // ==================================================

          setSpeakingUsers(
            (previous) => {
              const next =
                new Set(previous);

              if (
                speakingNow
              ) {
                next.add(
                  socketId
                );
              } else {
                next.delete(
                  socketId
                );
              }

              return next;
            }
          );

          // ==================================================
          // MISE À JOUR DE L'UTILISATEUR
          // ==================================================

          updateVoiceUsers(
            (previous) => {
              const exists =
                previous.some(
                  (item) =>
                    item.socketId ===
                    socketId
                );

              // Si l'utilisateur
              // existe déjà
              if (exists) {
                return previous.map(
                  (item) =>
                    item.socketId ===
                    socketId
                      ? {
                          ...item,
                          speaking:
                            speakingNow,
                        }
                      : item
                );
              }

              // Sécurité :
              // l'événement peut arriver
              // avant voice:user-joined
              console.warn(
                "⚠️ État vocal reçu avant l'arrivée du joueur."
              );

              return [
                ...previous,
                {
                  socketId,
                  user: {
                    username:
                      "Joueur",
                  },
                  speaking:
                    speakingNow,
                },
              ];
            }
          );
        }
      );

      // ======================================================
      // OFFER
      // ======================================================

      socket.on(
        "voice:offer",
        async ({
          from,
          offer,
        }) => {
          try {
            if (
              !from ||
              !offer
            ) {
              return;
            }

            console.log(
              "📨 Offer reçue de",
              from
            );

            const peer =
              await createPeer(
                from,
                false
              );

            if (!peer) {
              return;
            }

            await peer.setRemoteDescription(
              new RTCSessionDescription(
                offer
              )
            );

            const answer =
              await peer.createAnswer();

            await peer.setLocalDescription(
              answer
            );

            socket.emit(
              "voice:answer",
              {
                target: from,
                answer,
              }
            );
          } catch (error) {
            console.error(
              "❌ Erreur offer :",
              error
            );
          }
        }
      );

      // ======================================================
      // ANSWER
      // ======================================================

      socket.on(
        "voice:answer",
        async ({
          from,
          answer,
        }) => {
          try {
            if (
              !from ||
              !answer
            ) {
              return;
            }

            const peer =
              peersRef.current.get(
                from
              );

            if (!peer) {
              return;
            }

            await peer.setRemoteDescription(
              new RTCSessionDescription(
                answer
              )
            );

            console.log(
              "📨 Answer reçue de",
              from
            );
          } catch (error) {
            console.error(
              "❌ Erreur answer :",
              error
            );
          }
        }
      );

      // ======================================================
      // ICE
      // ======================================================

      socket.on(
        "voice:ice-candidate",
        async ({
          from,
          candidate,
        }) => {
          try {
            if (
              !from ||
              !candidate
            ) {
              return;
            }

            const peer =
              peersRef.current.get(
                from
              );

            if (!peer) {
              return;
            }

            await peer.addIceCandidate(
              new RTCIceCandidate(
                candidate
              )
            );
          } catch (error) {
            console.error(
              "❌ Erreur ICE :",
              error
            );
          }
        }
      );

      // ======================================================
      // JOUEUR PARTI
      // ======================================================

      socket.on(
        "voice:user-left",
        ({
          socketId,
        }) => {
          if (!socketId) {
            return;
          }

          console.log(
            "🚪 Joueur parti :",
            socketId
          );

          cleanupPeer(
            socketId
          );
        }
      );

      // ======================================================
      // ERREUR
      // ======================================================

      socket.on(
        "connect_error",
        (error) => {
          console.error(
            "❌ Connexion vocal :",
            error
          );

          setError(
            "Impossible de se connecter au vocal."
          );

          cleanupVoice();
        }
      );
    } catch (error) {
      console.error(
        "❌ Microphone :",
        error
      );

      if (
        error?.name ===
        "NotAllowedError"
      ) {
        setError(
          "Accès au microphone refusé. Autorise le microphone dans ton navigateur."
        );
      } else if (
        error?.name ===
        "NotFoundError"
      ) {
        setError(
          "Aucun microphone détecté sur cet appareil."
        );
      } else {
        setError(
          "Impossible d'accéder au microphone."
        );
      }

      cleanupVoice();
    }
  }

  // ==========================================================
  // QUITTER
  // ==========================================================

  function leaveVoice() {
    console.log(
      "🚪 Déconnexion du vocal..."
    );

    if (
      socketRef.current
    ) {
      try {
        socketRef.current.emit(
          "voice:leave",
          {
            squadId,
          }
        );
      } catch {}
    }

    cleanupVoice();
  }

  // ==========================================================
  // MICRO
  // ==========================================================

  function toggleMute() {
    const stream =
      localStreamRef.current;

    if (!stream) {
      return;
    }

    const audioTracks =
      stream.getAudioTracks();

    if (
      audioTracks.length ===
      0
    ) {
      return;
    }

    const shouldMute =
      audioTracks.some(
        (track) =>
          track.enabled
      );

    audioTracks.forEach(
      (track) => {
        track.enabled =
          !shouldMute;
      }
    );

    mutedRef.current =
      shouldMute;

    setMuted(
      shouldMute
    );

    if (shouldMute) {
      if (
        speakingRef.current
      ) {
        speakingRef.current =
          false;

        setSpeaking(false);

        socketRef.current?.emit(
          "voice:speaking",
          {
            squadId,
            speaking: false,
          }
        );
      }

      console.log(
        "🔇 Micro coupé"
      );
    } else {
      console.log(
        "🎤 Micro activé"
      );
    }
  }

  // ==========================================================
  // SON
  // ==========================================================

  function toggleDeafen() {
    const newValue =
      !deafened;

    setDeafened(
      newValue
    );

    audioRefs.current.forEach(
      (audio) => {
        audio.muted =
          newValue;
      }
    );

    console.log(
      newValue
        ? "🔇 Son coupé"
        : "🔊 Son activé"
    );
  }

  // ==========================================================
  // NETTOYAGE
  // ==========================================================

  useEffect(() => {
    return () => {
      cleanupVoice();
    };
  }, []);

  // ==========================================================
  // INTERFACE
  // ==========================================================

  return (
    <div
      style={{
        marginTop: 20,
        padding: 18,
        borderRadius: 16,
        background:
          "var(--panel, rgba(255,255,255,0.04))",
        border:
          "1px solid var(--border)",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <div className="eyebrow">
            VOCAL
          </div>

          <h3
            style={{
              margin:
                "4px 0 0",
            }}
          >
            🎙️ Salon vocal
          </h3>
        </div>

        {!connected ? (
          <button
            className="btn btn-primary"
            onClick={
              joinVoice
            }
          >
            🎙️ Rejoindre
          </button>
        ) : (
          <button
            className="btn btn-danger"
            onClick={
              leaveVoice
            }
          >
            🚪 Quitter
          </button>
        )}
      </div>

      {/* ERREUR */}

      {error && (
        <div
          className="error-banner"
          style={{
            marginTop: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* CONTENU */}

      {connected && (
        <>
          {/* CONTRÔLES */}

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 16,
            }}
          >
            <button
              className={
                muted
                  ? "btn btn-danger"
                  : "btn btn-ghost"
              }
              onClick={
                toggleMute
              }
            >
              {muted
                ? "🔇 Micro coupé"
                : speaking
                ? "🟢 Tu parles"
                : "🎤 Micro"}
            </button>

            <button
              className={
                deafened
                  ? "btn btn-danger"
                  : "btn btn-ghost"
              }
              onClick={
                toggleDeafen
              }
            >
              {deafened
                ? "🔇 Son coupé"
                : "🔊 Son"}
            </button>
          </div>

          {/* UTILISATEURS */}

          <div
            style={{
              marginTop: 18,
            }}
          >
            <div
              style={{
                color:
                  "var(--muted)",
                fontSize:
                  "0.8rem",
                marginBottom: 8,
              }}
            >
              👥 Dans le vocal
            </div>

            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: 8,
              }}
            >
              {/* TOI */}

              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 10,
                  padding:
                    speaking
                      ? "7px 10px"
                      : "0",
                  borderRadius: 10,
                  background:
                    speaking
                      ? "rgba(85,255,136,0.10)"
                      : "transparent",
                  boxShadow:
                    speaking
                      ? "0 0 15px rgba(85,255,136,0.18)"
                      : "none",
                  transition:
                    "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    filter:
                      speaking
                        ? "drop-shadow(0 0 6px #55ff88)"
                        : "none",
                  }}
                >
                  {speaking
                    ? "🟢"
                    : "⚫"}
                </span>

                <strong>
                  {user?.username ||
                    user?.name ||
                    "Toi"}
                </strong>

                <span
                  style={{
                    color:
                      speaking
                        ? "#55ff88"
                        : "var(--muted)",
                    fontSize:
                      "0.75rem",
                  }}
                >
                  {speaking
                    ? "parle"
                    : "toi"}
                </span>
              </div>

              {/* AUTRES JOUEURS */}

              {voiceUsers.map(
                (item) => {
                  // ⭐ ON UTILISE DIRECTEMENT
                  // item.speaking
                  const isSpeaking =
                    Boolean(
                      item.speaking
                    );

                  return (
                    <div
                      key={
                        item.socketId
                      }
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 10,
                        padding:
                          isSpeaking
                            ? "7px 10px"
                            : "0",
                        borderRadius: 10,
                        background:
                          isSpeaking
                            ? "rgba(85,255,136,0.10)"
                            : "transparent",
                        boxShadow:
                          isSpeaking
                            ? "0 0 15px rgba(85,255,136,0.18)"
                            : "none",
                        transition:
                          "all 0.15s ease",
                      }}
                    >
                      <span
                        style={{
                          filter:
                            isSpeaking
                              ? "drop-shadow(0 0 6px #55ff88)"
                              : "none",
                        }}
                      >
                        {isSpeaking
                          ? "🟢"
                          : "⚫"}
                      </span>

                      <strong
                        style={{
                          color:
                            isSpeaking
                              ? "#55ff88"
                              : "inherit",
                          transition:
                            "color 0.15s ease",
                        }}
                      >
                        {item.user
                          ?.username ||
                          item.user
                            ?.name ||
                          "Joueur"}
                      </strong>

                      {isSpeaking && (
                        <span
                          style={{
                            color:
                              "#55ff88",
                            fontSize:
                              "0.75rem",
                          }}
                        >
                          parle
                        </span>
                      )}
                    </div>
                  );
                }
              )}

              {/* PERSONNE */}

              {voiceUsers.length ===
                0 && (
                <span
                  style={{
                    color:
                      "var(--muted)",
                    fontSize:
                      "0.8rem",
                  }}
                >
                  Tu es seul dans
                  le salon pour le
                  moment.
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}