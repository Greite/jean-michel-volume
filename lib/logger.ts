/**
 * Utilitaire de logging conditionnel basé sur la variable d'environnement DEBUG_MODE
 * Évite de logger des données sensibles en production
 */

const isDebugMode = process.env.DEBUG_MODE === "true";

export const logger = {
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
