import Image from "next/image";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-800 bg-[#191414]/80 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex flex-col items-center gap-4 sm:gap-6">
          {/* Logo et titre */}
          <div className="flex items-center gap-3">
            <Image
              src="/icon.webp"
              alt="Jean-Michel Volume"
              width={48}
              height={48}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg"
            />
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#1DB954]">
                Jean-Michel Volume
              </h3>
              <p className="text-xs sm:text-sm text-gray-400">
                Contrôlez Spotify avec votre voix
              </p>
            </div>
          </div>

          {/* Liens */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
            <a
              href="https://www.spotify.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#1DB954] transition-colors"
            >
              Spotify
            </a>
            <a
              href="https://developer.spotify.com/documentation/web-api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#1DB954] transition-colors"
            >
              API Spotify
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#1DB954] transition-colors"
            >
              GitHub
            </a>
          </div>

          {/* Séparateur */}
          <div className="w-full max-w-md border-t border-gray-800" />

          {/* Copyright et infos */}
          <div className="text-center space-y-1">
            <p className="text-xs sm:text-sm text-gray-400">
              © {currentYear} Gauthier Painteaux. Tous droits réservés.
            </p>
            <p className="text-xs text-gray-500">
              Nécessite un compte Spotify Premium et l&apos;application desktop
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
