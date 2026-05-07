import { type NextRequest, NextResponse } from 'next/server';

/**
 * Génère un nonce CSP par requête et l'expose en header `x-nonce`
 * pour que les Server Components (ex. ThemeScript) puissent l'injecter
 * sur leurs scripts inline. Définit aussi le Content-Security-Policy.
 *
 * `'strict-dynamic'` permet aux scripts de confiance (ceux qui portent le
 * nonce) de charger d'autres scripts sans avoir à lister chaque source.
 * En dev, on autorise `'unsafe-eval'` car HMR / React Refresh en a besoin.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV !== 'production';

  const csp = [
    "default-src 'self'",
    "img-src 'self' data: https://*.scdn.co https://*.spotifycdn.com",
    "media-src 'self' blob:",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ''}`.trim(),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.spotify.com https://accounts.spotify.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.spotify.com",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    // Exclut les assets statiques et l'optimisation d'images Next.
    '/((?!_next/static|_next/image|favicon.ico|icon\\.svg|icon-192\\.png|icon-512\\.png|icon-maskable-512\\.png|manifest.webmanifest).*)',
  ],
};
