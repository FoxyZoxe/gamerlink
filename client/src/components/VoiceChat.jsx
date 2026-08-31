import {
  useEffect,
  useRef,
  useState,
} from "react";

import { io } from "socket.io-client";

const SOCKET_URL =
  "https://gamerlink.onrender.com";

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

function getAudioSettings() {
  try {
    const saved =
      localStorage.getItem(
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

export default function VoiceChat({
  squadId,
  user,
}) {
  // ==========================================================
  // REFS
  // ==========================================================

  const socketRef =
    useRef(null);

  const localStreamRef =
    useRef(null);

  const peersRef =
    useRef(new Map());

  const audioRefs =
    useRef(new Map());

  const audioGainRefs =
    useRef(new Map());

  const audioContextRef =
    useRef(null);

  const analyserRef =
    useRef(null);

  const voiceAnimationRef =
    useRef(null);

  const speakingRef =
    useRef(false);

  const mutedRef =
    useRef(false);

  const audioSettingsRef =
    useRef(getAudioSettings());

  // ==========================================================
  // ÉTATS
  // ==========================================================

  const [
    speakingUsers,
    setSpeakingUsers,
  ] = useState(new Set());

  const [
    connected,
    setConnected,
  ] = useState(false);

  const [
    muted,
    setMuted,
  ] = useState(false);

  const [
    deafened,
    setDeafened,
  ] = useState(false);

  const [
    voiceUsers,
    setVoiceUsers,
  ] = useState([]);

  const [
    speaking,
    setSpeaking,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    audioSettings,
    setAudioSettings,
  ] = useState(
    getAudioSettings()
  );

  // ==========================================================
  // RÉGLAGES AUDIO
  // ==========================================================

  useEffect(() => {
    audioSettingsRef.current =
      audioSettings;
  }, [audioSettings]);

  useEffect(() => {
    function handleSettingsChange(
      event
    ) {
      const settings = {
        ...DEFAULT_AUDIO_SETTINGS,
        ...(event.detail || {}),
      };

      audioSettingsRef.current =
        settings;

      setAudioSettings(settings);

      applyOutputSettings(
        settings
      );

      if (
        localStreamRef.current
      ) {
        const track =
          localStreamRef.current.getAudioTracks()[0];

        if (track) {
          try {
            track.applyConstraints({
              echoCancellation:
                settings.echoCancellation,
              noiseSuppression:
                settings.noiseSuppression,
              autoGainControl:
                settings.autoGainControl,
            });
          } catch {}
        }
      }

      applyVoiceDetectionSettings();
    }

    window.addEventListener(
      "gamerlink-audio-settings-changed",
      handleSettingsChange
    );

    return () => {
      window.removeEventListener(
        "gamerlink-audio-settings-changed",
        handleSettingsChange
      );
    };
  }, []);

  // ==========================================================
  // DÉTECTION DE VOIX
  // ==========================================================

  function stopVoiceDetection() {
    if (
      voiceAnimationRef.current
    ) {
      cancelAnimationFrame(
        voiceAnimationRef.current
      );

      voiceAnimationRef.current =
        null;
    }

    if (
      audioContextRef.current
    ) {
      try {
        audioContextRef.current.close();
      } catch {}

      audioContextRef.current =
        null;
    }

    analyserRef.current =
      null;

    if (
      speakingRef.current
    ) {
      speakingRef.current =
        false;

      setSpeaking(false);

      if (
        socketRef.current
      ) {
        socketRef.current.emit(
          "voice:speaking",
          {
            squadId,
            speaking: false,
          }
        );
      }
    }
  }

  function startVoiceDetection(
    stream,
    socket
  ) {
    try {
      stopVoiceDetection();

      const settings =
        audioSettingsRef.current;

      if (
        !settings.voiceDetection
      ) {
        console.log(
          "🔇 Détection de voix désactivée"
        );

        return;
      }

      if (!stream || !socket) {
        return;
      }

      const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContextClass) {
        console.warn(
          "⚠️ AudioContext indisponible"
        );

        return;
      }

      const audioContext =
        new AudioContextClass();

      const analyser =
        audioContext.createAnalyser();

      analyser.fftSize = 512;
      analyser.smoothingTimeConstant =
        0.7;

      const source =
        audioContext.createMediaStreamSource(
          stream
        );

      source.connect(analyser);

      audioContextRef.current =
        audioContext;

      analyserRef.current =
        analyser;

      const data =
        new Uint8Array(
          analyser.fftSize
        );

      let lastVoiceTime =
        performance.now();

      const detect = () => {
        if (
          !analyserRef.current ||
          !localStreamRef.current
        ) {
          return;
        }

        const currentSettings =
          audioSettingsRef.current;

        if (
          !currentSettings.voiceDetection
        ) {
          voiceAnimationRef.current =
            requestAnimationFrame(
              detect
            );

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
            (data[i] - 128) /
            128;

          sum +=
            value * value;
        }

        const volume =
          Math.sqrt(
            sum / data.length
          );

        /*
         * Sensibilité :
         *
         * 5  = très sensible
         * 35 = valeur normale
         * 100 = peu sensible
         */

        const sensitivity =
          Math.max(
            5,
            Math.min(
              100,
              Number(
                currentSettings.sensitivity
              ) || 35
            )
          );

        const threshold =
          0.008 +
          (sensitivity / 100) *
            0.055;

        const startThreshold =
          threshold;

        const stopThreshold =
          threshold * 0.65;

        const now =
          performance.now();

        if (
          mutedRef.current
        ) {
          if (
            speakingRef.current
          ) {
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
          }
        } else if (
          volume >=
          startThreshold
        ) {
          lastVoiceTime = now;

          if (
            !speakingRef.current
          ) {
            speakingRef.current =
              true;

            setSpeaking(true);

            socket.emit(
              "voice:speaking",
              {
                squadId,
                speaking: true,
              }
            );

            console.log(
              "🎙️ TU PARLES → envoi serveur"
            );
          }
        } else if (
          speakingRef.current &&
          volume <
            stopThreshold &&
          now -
            lastVoiceTime >
            350
        ) {
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
            "🔇 TU NE PARLES PLUS → envoi serveur"
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
    } catch (error) {
      console.error(
        "❌ Erreur détection voix :",
        error
      );
    }
  }

  function applyVoiceDetectionSettings() {
    if (
      !localStreamRef.current ||
      !socketRef.current
    ) {
      return;
    }

    startVoiceDetection(
      localStreamRef.current,
      socketRef.current
    );
  }

  // ==========================================================
  // AUDIO DISTANT
  // ==========================================================

  async function applyOutputSettings(
    settings = audioSettingsRef.current
  ) {
    for (
      const audio of audioRefs.current.values()
    ) {
      audio.volume = Math.max(
        0,
        Math.min(
          1,
          Number(
            settings.outputVolume
          ) / 100
        )
      );

      audio.muted =
        deafened ||
        Number(
          settings.outputVolume
        ) <= 0;

      if (
        settings.outputDeviceId &&
        typeof audio.setSinkId ===
          "function"
      ) {
        try {
          await audio.setSinkId(
            settings.outputDeviceId
          );
        } catch (error) {
          console.warn(
            "⚠️ Impossible de sélectionner la sortie audio :",
            error
          );
        }
      }
    }
  }

  // ==========================================================
  // NETTOYAGE PEER
  // ==========================================================

  function cleanupPeer(
    socketId
  ) {
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

      audio.srcObject =
        null;

      audio.remove();

      audioRefs.current.delete(
        socketId
      );
    }

    const gain =
      audioGainRefs.current.get(
        socketId
      );

    if (gain) {
      try {
        gain.context.close();
      } catch {}

      audioGainRefs.current.delete(
        socketId
      );
    }

    setSpeakingUsers(
      (previous) => {
        const next =
          new Set(previous);

        next.delete(
          socketId
        );

        return next;
      }
    );

    setVoiceUsers(
      (users) =>
        users.filter(
          (item) =>
            item.socketId !==
            socketId
        )
    );
  }

  // ==========================================================
  // NETTOYAGE VOCAL
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

        socketRef.current.emit(
          "voice:leave",
          {
            squadId,
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

        audio.srcObject =
          null;

        audio.remove();
      }
    );

    audioRefs.current.clear();

    audioGainRefs.current.forEach(
      (gain) => {
        try {
          gain.context.close();
        } catch {}
      }
    );

    audioGainRefs.current.clear();

    if (
      localStreamRef.current
    ) {
      localStreamRef.current
        .getTracks()
        .forEach(
          (track) => {
            try {
              track.stop();
            } catch {}
          }
        );

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
        .forEach(
          (track) => {
            peer.addTrack(
              track,
              localStreamRef.current
            );
          }
        );
    }

    // ========================================================
    // AUDIO DISTANT
    // ========================================================

    peer.ontrack = (
      event
    ) => {
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

        audio.autoplay =
          true;

        audio.playsInline =
          true;

        audio.controls =
          false;

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

      const settings =
        audioSettingsRef.current;

      audio.volume =
        Math.max(
          0,
          Math.min(
            1,
            Number(
              settings.outputVolume
            ) / 100
          )
        );

      audio.muted =
        deafened ||
        Number(
          settings.outputVolume
        ) <= 0;

      if (
        settings.outputDeviceId &&
        typeof audio.setSinkId ===
          "function"
      ) {
        audio
          .setSinkId(
            settings.outputDeviceId
          )
          .catch(() => {});
      }

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

      const settings =
        audioSettingsRef.current;

      console.log(
        "🎤 Demande microphone..."
      );

      const audioConstraints = {
        echoCancellation:
          settings.echoCancellation,

        noiseSuppression:
          settings.noiseSuppression,

        autoGainControl:
          settings.autoGainControl,
      };

      if (
        settings.microphoneId
      ) {
        audioConstraints.deviceId = {
          exact:
            settings.microphoneId,
        };
      }

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio:
              audioConstraints,
            video: false,
          }
        );

      localStreamRef.current =
        stream;

      const track =
        stream.getAudioTracks()[0];

      if (track) {
        try {
          await track.applyConstraints(
            {
              echoCancellation:
                settings.echoCancellation,

              noiseSuppression:
                settings.noiseSuppression,

              autoGainControl:
                settings.autoGainControl,
            }
          );
        } catch {}
      }

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
      // UTILISATEURS PRÉSENTS
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
          user:
            joinedUser,
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

          setVoiceUsers(
            (previous) => {
              const existing =
                previous.find(
                  (item) =>
                    item.socketId ===
                    socketId
                );

              if (existing) {
                return previous;
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

          if (
            joinedSpeaking
          ) {
            setSpeakingUsers(
              (previous) => {
                const next =
                  new Set(
                    previous
                  );

                next.add(
                  socketId
                );

                return next;
              }
            );
          }

          /*
           * Le nouveau joueur n'est pas forcément
           * celui qui doit créer l'offre.
           *
           * Le joueur déjà présent crée le peer.
           */
          createPeer(
            socketId,
            true
          ).catch(
            (error) =>
              console.error(
                "❌ Création peer nouveau joueur :",
                error
              )
          );
        }
      );

      // ======================================================
      // JOUEUR PARLE
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

          console.log(
            "🎙️ État vocal reçu :",
            socketId,
            isSpeaking
          );

          setSpeakingUsers(
            (previous) => {
              const next =
                new Set(
                  previous
                );

              if (
                isSpeaking
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

          setVoiceUsers(
            (previous) =>
              previous.map(
                (item) =>
                  item.socketId ===
                  socketId
                    ? {
                        ...item,
                        speaking:
                          Boolean(
                            isSpeaking
                          ),
                      }
                    : item
              )
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
              "❌ Erreur traitement offer :",
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
          } catch (error) {
            console.error(
              "❌ Erreur traitement answer :",
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
              "❌ ICE candidate :",
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
          console.log(
            "🚪 Joueur parti :",
            socketId
          );

          if (socketId) {
            cleanupPeer(
              socketId
            );
          }
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
      } else if (
        error?.name ===
        "OverconstrainedError"
      ) {
        setError(
          "Le microphone sélectionné n'est plus disponible."
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
      speakingRef.current =
        false;

      setSpeaking(false);

      if (
        socketRef.current
      ) {
        socketRef.current.emit(
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
          newValue ||
          Number(
            audioSettingsRef.current
              .outputVolume
          ) <= 0;
      }
    );

    console.log(
      newValue
        ? "🔇 Son coupé"
        : "🔊 Son activé"
    );
  }

  // ==========================================================
  // CHANGEMENT SENSIBILITÉ
  // ==========================================================

  useEffect(() => {
    if (
      connected &&
      localStreamRef.current &&
      socketRef.current
    ) {
      applyVoiceDetectionSettings();
    }
  }, [
    audioSettings.voiceDetection,
    audioSettings.sensitivity,
  ]);

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
      {/* ====================================================
          HEADER
      ==================================================== */}

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

      {/* ====================================================
          ERREUR
      ==================================================== */}

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

      {/* ====================================================
          CONTENU
      ==================================================== */}

      {connected && (
        <>
          {/* CONTRÔLES */}

          <div
            style={{
              display:
                "flex",
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
                display:
                  "flex",
                flexDirection:
                  "column",
                gap: 8,
              }}
            >
              {/* TOI */}

              <div
                style={{
                  display:
                    "flex",
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

              {/* AUTRES */}

              {voiceUsers.map(
                (item) => {
                  const isSpeaking =
                    speakingUsers.has(
                      item.socketId
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