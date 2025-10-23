import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { VoiceVolumeController } from "@/components/VoiceVolumeController";
import { SignInButton } from "@/components/SignInButton";
import { SignOutButton } from "@/components/SignOutButton";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#191414] via-[#282828] to-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#191414]/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-3xl">👷‍♂️</div>
            <h1 className="text-2xl font-bold text-[#1DB954]">
              Jean-Michel Volume
            </h1>
          </div>

          {session ? <SignOutButton /> : <SignInButton />}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {session ? (
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Carte principale */}
            <div className="bg-[#282828] rounded-2xl shadow-xl p-8 border border-gray-800">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Contrôlez Spotify avec votre voix
                </h2>
                <p className="text-gray-400">
                  Enregistrez pendant 5 secondes et le volume s&apos;ajustera au pic maximum
                </p>
              </div>

              <VoiceVolumeController />
            </div>

            {/* Instructions */}
            <div className="bg-[#181818] rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>💡</span>
                Comment ça marche ?
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-[#1DB954] font-bold">1.</span>
                  <span>
                    Assurez-vous qu&apos;un appareil Spotify est actif et en
                    lecture
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1DB954] font-bold">2.</span>
                  <span>
                    Cliquez sur &quot;Démarrer l&apos;enregistrement&quot; et
                    autorisez l&apos;accès au microphone
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1DB954] font-bold">3.</span>
                  <span>
                    Pendant 5 secondes, faites du bruit dans le micro !
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#1DB954] font-bold">4.</span>
                  <span>
                    Le volume Spotify s&apos;ajustera au pic maximum de votre enregistrement
                  </span>
                </li>
              </ul>
            </div>

            {/* Note technique */}
            <div className="bg-[#181818] border border-[#1DB954]/30 rounded-lg p-4 text-sm text-gray-300">
              <p className="font-semibold mb-2 text-[#1DB954]">⚠️ Notes importantes :</p>
              <ul className="space-y-2 list-disc list-inside">
                <li>
                  Vous devez avoir un <strong>compte Spotify Premium</strong>
                </li>
                <li>
                  Utilisez l&apos;<strong>application desktop Spotify</strong> (Windows/Mac/Linux)
                </li>
                <li>
                  Le <strong>Web Player</strong> et certaines enceintes ne permettent pas le contrôle du volume
                </li>
                <li>
                  La musique doit être <strong>en lecture</strong> sur l&apos;appareil
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-[#282828] rounded-2xl shadow-xl p-12 border border-gray-800">
              <div className="text-6xl mb-6">🎤</div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Bienvenue sur Jean-Michel Volume !
              </h2>
              <p className="text-gray-300 mb-8">
                Connectez-vous avec Spotify pour commencer à contrôler le volume
                avec votre voix
              </p>
              <SignInButton />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
