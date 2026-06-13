import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/spotify-api', () => ({ setSpotifyVolume: vi.fn() }));

import { getServerSession } from 'next-auth/next';

import { POST } from './route';

import { setSpotifyVolume } from '@/lib/spotify-api';

const mockedSession = vi.mocked(getServerSession);
const mockedSetVolume = vi.mocked(setSpotifyVolume);

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/spotify/volume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function rawRequest(body: string, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/spotify/volume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

beforeEach(() => {
  mockedSession.mockResolvedValue({ accessToken: 'tok', user: { email: 'u@e.com' } } as never);
});
afterEach(() => vi.clearAllMocks());

describe('POST /api/spotify/volume', () => {
  it('retourne 401 sans session', async () => {
    mockedSession.mockResolvedValueOnce(null as never);
    const res = await POST(makeRequest({ volume: 50 }, { 'x-forwarded-for': '1.1.1.1' }));
    expect(res.status).toBe(401);
  });

  it('retourne 400 pour un volume hors bornes', async () => {
    const res = await POST(makeRequest({ volume: 150 }, { 'x-forwarded-for': '1.1.1.2' }));
    expect(res.status).toBe(400);
  });

  it('appelle setSpotifyVolume et retourne success+volume arrondi', async () => {
    mockedSetVolume.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const res = await POST(makeRequest({ volume: 42.6 }, { 'x-forwarded-for': '1.1.1.3' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true, volume: 43 });
    expect(mockedSetVolume).toHaveBeenCalledWith('tok', 42.6);
  });

  it('propage le statut d’erreur Spotify', async () => {
    mockedSetVolume.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { reason: 'NO_ACTIVE_DEVICE' } }), { status: 404 }),
    );
    const res = await POST(makeRequest({ volume: 30 }, { 'x-forwarded-for': '1.1.1.4' }));
    expect(res.status).toBe(404);
  });

  it('retourne 400 pour un JSON invalide', async () => {
    const res = await POST(rawRequest('not json', { 'x-forwarded-for': '4.4.4.1' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid JSON');
  });

  it('propage l’erreur Spotify avec un body non-JSON', async () => {
    mockedSetVolume.mockResolvedValueOnce(new Response('oops', { status: 500 }));
    const res = await POST(makeRequest({ volume: 30 }, { 'x-forwarded-for': '4.4.4.2' }));
    expect(res.status).toBe(500);
    expect((await res.json()).details).toEqual({ error: 'oops' });
  });

  it('500 quand setSpotifyVolume rejette (erreur interne)', async () => {
    mockedSetVolume.mockRejectedValueOnce(new Error('boom'));
    const res = await POST(makeRequest({ volume: 30 }, { 'x-forwarded-for': '4.4.4.3' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Internal server error');
  });

  it('retourne 429 quand le rate-limit est dépassé', async () => {
    const ip = '9.9.9.9';
    mockedSetVolume.mockResolvedValue(new Response(null, { status: 204 }));
    let last: Response | undefined;
    for (let i = 0; i < 25; i++) {
      last = await POST(makeRequest({ volume: 10 }, { 'x-forwarded-for': ip }));
    }
    expect(last?.status).toBe(429);
  });
});
