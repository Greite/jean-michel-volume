/**
 * Utilitaire de logging conditionnel pour le client
 * Basé sur la variable d'environnement NEXT_PUBLIC_DEBUG_MODE
 * Évite de logger des données sensibles en production
 */

const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

export const clientLogger = {
  log: (..._args: unknown[]) => {
    if (isDebugMode) {
    }
  },
  error: (..._args: unknown[]) => {
    if (isDebugMode) {
    }
  },
  warn: (..._args: unknown[]) => {
    if (isDebugMode) {
    }
  },
  info: (..._args: unknown[]) => {
    if (isDebugMode) {
    }
  },
};
