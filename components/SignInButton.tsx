"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("spotify", { callbackUrl: "/" })}
      className="px-6 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black rounded-full font-bold transition-all shadow-lg shadow-[#1DB954]/50"
    >
      Se connecter avec Spotify
    </button>
  );
}
