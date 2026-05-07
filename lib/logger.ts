/**
 * Utilitaire de logging conditionnel basé sur la variable d'environnement DEBUG_MODE
 * Évite de logger des données sensibles en production
 */

const isDebugMode = process.env.DEBUG_MODE === 'true';

export const logger = {
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
