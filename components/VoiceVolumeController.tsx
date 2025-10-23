"use client";

import { useVoiceVolume } from "@/hooks/useVoiceVolume";
import { useEffect, useState } from "react";

export function VoiceVolumeController() {
  const {
    currentVolume,
    maxVolume,
    isRecording,
    error,
    countdown,
    startRecording,
  } = useVoiceVolume();

  const [spotifyVolume, setSpotifyVolume] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<{
    device?: string;
    isPlaying?: boolean;
  }>({});
  const [lastMaxVolume, setLastMaxVolume] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);

  // Envoyer le volume maximum à Spotify quand l'enregistrement se termine
  useEffect(() => {
    if (!isRecording && maxVolume > 0) {
      const updateSpotifyVolume = async () => {
        try {
          setApiError(null);
          const response = await fetch("/api/spotify/volume", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ volume: maxVolume }),
          });

          if (response.ok) {
            const data = await response.json();
            setSpotifyVolume(data.volume);
            setLastMaxVolume(maxVolume);
          } else {
            const errorData = await response.json();
            console.error("Spotify API error:", errorData);

            // Vérifier si c'est une erreur de contrôle du volume
            if (errorData.details?.error?.reason === "VOLUME_CONTROL_DISALLOW") {
              setApiError(
                "❌ Contrôle du volume impossible sur cet appareil. Veuillez utiliser l'application desktop Spotify (Windows/Mac/Linux) au lieu du Web Player ou d'une enceinte connectée."
              );
            } else if (response.status === 403) {
              setApiError(
                "Erreur 403: Assurez-vous d'avoir un appareil Spotify actif avec de la musique en lecture, et que vous avez un compte Spotify Premium."
              );
            } else if (response.status === 404) {
              setApiError("Aucun appareil Spotify actif trouvé. Lancez Spotify sur un appareil.");
            } else {
              setApiError(
                `Erreur ${response.status}: ${errorData.error || "Impossible de modifier le volume"}`
              );
            }
          }
        } catch (error) {
          console.error("Error updating Spotify volume:", error);
          setApiError("Erreur de connexion à l'API Spotify");
        }
      };

      updateSpotifyVolume();
    }
  }, [isRecording, maxVolume]);

  // Récupérer l'état de lecture actuel
  useEffect(() => {
    const fetchPlaybackState = async () => {
      try {
        const response = await fetch("/api/spotify/volume");
        if (response.ok) {
          const data = await response.json();
          setDeviceInfo({
            device: data.device,
            isPlaying: data.isPlaying,
          });
          setSpotifyVolume(data.volume);
        }
      } catch (error) {
        console.error("Error fetching playback state:", error);
      }
    };

    fetchPlaybackState();
    const interval = setInterval(fetchPlaybackState, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Compte à rebours pendant l'enregistrement */}
      {isRecording && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative">
            <div className="text-8xl font-bold text-[#1DB954] animate-pulse">
              {countdown}
            </div>
            <div className="absolute -inset-4 border-4 border-[#1DB954] rounded-full animate-ping opacity-20" />
          </div>
          <p className="text-gray-400 mt-4 text-lg">
            Enregistrement en cours... Faites du bruit !
          </p>
        </div>
      )}

      {/* Visualisation du volume actuel pendant l'enregistrement */}
      {isRecording && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Volume actuel</h3>
            <span className="text-2xl font-bold text-[#1DB954]">
              {Math.round(currentVolume)}%
            </span>
          </div>

          <div className="relative h-8 bg-[#181818] rounded-full overflow-hidden border border-gray-800">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] transition-all duration-100 ease-out"
              style={{ width: `${currentVolume}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex space-x-1">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      i < (currentVolume / 100) * 20
                        ? "h-6 bg-black/60"
                        : "h-2 bg-gray-700/50"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Volume maximum enregistré */}
      {!isRecording && maxVolume > 0 && (
        <div className="space-y-3 bg-[#181818] rounded-xl p-4 border border-[#1DB954]/30">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-[#1DB954]">
              🎤 Volume maximum enregistré
            </h3>
            <span className="text-2xl font-bold text-[#1DB954]">
              {Math.round(lastMaxVolume)}%
            </span>
          </div>
          <div className="relative h-4 bg-black rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-[#1DB954] transition-all duration-300"
              style={{ width: `${lastMaxVolume}%` }}
            />
          </div>
        </div>
      )}

      {/* Visualisation du volume Spotify */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Volume Spotify</h3>
          <span className="text-2xl font-bold text-[#1DB954]">
            {Math.round(spotifyVolume)}%
          </span>
        </div>

        <div className="relative h-8 bg-[#181818] rounded-full overflow-hidden border border-gray-800">
          <div
            className="absolute top-0 left-0 h-full bg-[#1DB954] transition-all duration-300 ease-out"
            style={{ width: `${spotifyVolume}%` }}
          />
        </div>

        {deviceInfo.device && (
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Appareil: {deviceInfo.device}</span>
            <span className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  deviceInfo.isPlaying ? "bg-[#1DB954]" : "bg-gray-600"
                }`}
              />
              {deviceInfo.isPlaying ? "En lecture" : "En pause"}
            </span>
          </div>
        )}
      </div>

      {/* Bouton d'enregistrement */}
      <button
        onClick={startRecording}
        disabled={isRecording}
        className={`w-full py-4 px-6 rounded-full font-bold transition-all duration-200 transform ${
          isRecording
            ? "bg-gray-600 cursor-not-allowed"
            : "bg-[#1DB954] hover:bg-[#1ed760] hover:scale-105 active:scale-95 shadow-lg shadow-[#1DB954]/50"
        } text-black`}
      >
        {isRecording ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 bg-black rounded-full animate-pulse" />
            Enregistrement...
          </span>
        ) : (
          <span>🎤 Démarrer l&apos;enregistrement (5 sec)</span>
        )}
      </button>

      {/* Messages d'erreur */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Erreur API Spotify */}
      {apiError && (
        <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg text-yellow-400 text-sm">
          <p className="font-semibold mb-1">⚠️ Erreur Spotify</p>
          <p>{apiError}</p>
        </div>
      )}
    </div>
  );
}
