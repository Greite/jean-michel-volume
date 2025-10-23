"use client";

import { SessionProvider } from "next-auth/react";
import { SessionErrorHandler } from "./SessionErrorHandler";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionErrorHandler />
      {children}
    </SessionProvider>
  );
}
