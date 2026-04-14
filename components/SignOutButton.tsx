"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="px-3 sm:px-4 py-2 bg-[#282828] hover:bg-[#3E3E3E] text-white rounded-lg font-medium transition-colors text-xs sm:text-sm md:text-base whitespace-nowrap"
    >
      <span className="hidden sm:inline">Déconnexion</span>
      <span className="sm:hidden">Quitter</span>
    </button>
  );
}
