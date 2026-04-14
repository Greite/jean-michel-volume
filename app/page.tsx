import Image from "next/image";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Footer } from "@/components/Footer";
import { SignInButton } from "@/components/SignInButton";
import { SignOutButton } from "@/components/SignOutButton";
import { VoiceVolumeController } from "@/components/VoiceVolumeController";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#191414] via-[#282828] to-black flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#191414]/80 backdrop-blur-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Image
              src="/icon.webp"
              alt="Jean-Michel Volume"
              width={40}
              height={40}
              className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-lg"
            />
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1DB954] truncate">
              Jean-Michel Volume
            </h1>
          </div>

          <div className="flex-shrink-0">
            {session ? <SignOutButton /> : <SignInButton />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 md:py-12 flex-1">
        {session ? (
          <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
            {/* Carte principale */}
            <div className="bg-[#282828] rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border border-gray-800">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">
                  Contrôlez Spotify avec votre voix
                </h2>
                <p className="text-sm sm:text-base text-gray-400">
                  Enregistrez pendant 5 secondes et le volume s&apos;ajustera au
                  pic maximum
                </p>
              </div>

              <VoiceVolumeController />
            </div>

            {/* Instructions */}
            <div className="bg-[#181818] rounded-xl p-4 sm:p-6 border border-gray-800">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <span>💡</span>
                Comment ça marche ?
              </h3>
              <ul className="space-y-2 text-sm sm:text-base text-gray-300">
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
                    Le volume Spotify s&apos;ajustera au pic maximum de votre
                    enregistrement
                  </span>
                </li>
              </ul>
            </div>

            {/* Note technique */}
            <div className="bg-[#181818] border border-[#1DB954]/30 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-gray-300">
              <p className="font-semibold mb-2 text-[#1DB954]">
                ⚠️&nbsp;&nbsp;Notes importantes :
              </p>
              <ul className="space-y-1.5 sm:space-y-2 list-disc list-inside">
                <li>
                  Vous devez avoir un <strong>compte Spotify Premium</strong>
                </li>
                <li>
                  Utilisez l&apos;<strong>application desktop Spotify</strong>{" "}
                  (Windows/Mac/Linux)
                </li>
                <li>
                  Le <strong>Web Player</strong> et certaines enceintes ne
                  permettent pas le contrôle du volume
                </li>
                <li>
                  La musique doit être <strong>en lecture</strong> sur
                  l&apos;appareil
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-[#282828] rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8 md:p-12 border border-gray-800">
              <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">🎤</div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                Bienvenue sur Jean-Michel Volume !
              </h2>
              <p className="text-sm sm:text-base text-gray-300 mb-6 sm:mb-8">
                Connectez-vous avec Spotify pour commencer à contrôler le volume
                avec votre voix
              </p>
              <SignInButton />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
