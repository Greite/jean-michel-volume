/**
 * Utilitaire de logging conditionnel pour le client
 * Basé sur la variable d'environnement NEXT_PUBLIC_DEBUG_MODE
 * Évite de logger des données sensibles en production
 */

const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === "true";

export const clientLogger = {
  log: (...args: unknown[]) => {
    if (isDebugMode) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isDebugMode) {
      console.error(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDebugMode) {
      console.warn(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDebugMode) {
      console.info(...args);
    }
  },
};
