"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="px-4 py-2 bg-[#282828] hover:bg-[#3E3E3E] text-white rounded-lg font-medium transition-colors"
    >
      Déconnexion
    </button>
  );
}
