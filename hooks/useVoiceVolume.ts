"use client";

import { useEffect, useRef, useState } from "react";
import { clientLogger } from "@/lib/client-logger";

const RECORDING_DURATION = 5000; // 5 secondes en millisecondes

export function useVoiceVolume() {
  const [currentVolume, setCurrentVolume] = useState(0);
  const [maxVolume, setMaxVolume] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const maxVolumeRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      setError(null);
      setMaxVolume(0);
      maxVolumeRef.current = 0;
      setCountdown(5);

      // Demander l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Créer le contexte audio
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);

      // Configurer l'analyseur
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Connecter le micro à l'analyseur
      microphoneRef.current.connect(analyserRef.current);

      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Compte à rebours
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Fonction pour analyser le volume en temps réel
      const updateVolume = () => {
        if (!analyserRef.current || !startTimeRef.current) return;

        const elapsed = Date.now() - startTimeRef.current;

        // Arrêter après 5 secondes
        if (elapsed >= RECORDING_DURATION) {
          stopRecording();
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculer le volume maximum (au lieu de la moyenne)
        let max = 0;
        for (let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > max) {
            max = dataArray[i];
          }
        }

        // Normaliser entre 0 et 100 avec une sensibilité plus élevée
        const normalizedVolume = Math.min(100, (max / 255) * 100);

        setCurrentVolume(normalizedVolume);

        // Mettre à jour le volume maximum
        if (normalizedVolume > maxVolumeRef.current) {
          maxVolumeRef.current = normalizedVolume;
          setMaxVolume(normalizedVolume);
        }

        rafIdRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      clientLogger.error("Error accessing microphone:", err);
      setError(
        "Impossible d'accéder au microphone. Veuillez autoriser l'accès."
      );
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    // Arrêter l'animation frame
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Arrêter le compte à rebours
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Arrêter le stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Fermer le contexte audio
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    microphoneRef.current = null;
    analyserRef.current = null;
    startTimeRef.current = null;
    setIsRecording(false);
    setCurrentVolume(0);
    setCountdown(5);
  };

  // Nettoyer lors du démontage du composant
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return {
    currentVolume,
    maxVolume,
    isRecording,
    error,
    countdown,
    startRecording,
    stopRecording,
  };
}
