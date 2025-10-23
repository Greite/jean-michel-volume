"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";

/**
 * Composant qui gère les erreurs de session (token expiré, etc.)
 * et déconnecte automatiquement l'utilisateur si nécessaire
 */
export function SessionErrorHandler() {
  const { data: session } = useSession();

  useEffect(() => {
    // Si la session contient une erreur de refresh du token, déconnecter l'utilisateur
    if (session?.error === "RefreshAccessTokenError") {
      signOut({ callbackUrl: "/" });
    }
  }, [session]);

  return null;
}
