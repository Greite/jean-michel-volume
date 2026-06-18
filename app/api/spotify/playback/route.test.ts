import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn(), getAccessToken: vi.fn() } },
}));
vi.mock('@/lib/spotify-api', () => ({
  getPlaybackState: vi.fn(),
  controlPlayback: vi.fn(),
  transferPlayback: vi.fn(),
}));

import { GET, POST } from './route';

import { auth } from '@/lib/auth';
import { controlPlayback, getPlaybackState, transferPlayback } from '@/lib/spotify-api';
import { playbackStateFixture } from '@/test/fixtures';

const mockedSession = vi.mocked(auth.api.getSession);

function postReq(body: unknown, ip: string) {
  return new Request('http://localhost/api/spotify/playback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

function rawReq(body: string, ip: string) {
  return new Request('http://localhost/api/spotify/playback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body,
  });
}

beforeEach(() => {
  mockedSession.mockResolvedValue({ user: { id: 'u1' } } as never);
  vi.mocked(auth.api.getAccessToken).mockResolvedValue({ accessToken: 'tok' } as never);
});
afterEach(() => vi.clearAllMocks());

describe('GET /api/spotify/playback', () => {
  it('401 sans session', async () => {
    mockedSession.mockResolvedValueOnce(null as never);
    expect((await GET()).status).toBe(401);
  });

  it('retourne l’état de lecture', async () => {
    vi.mocked(getPlaybackState).mockResolvedValueOnce(playbackStateFixture());
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).track.name).toBeDefined();
  });

  it('502 si getPlaybackState renvoie null', async () => {
    vi.mocked(getPlaybackState).mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(502);
  });

  it('500 quand getPlaybackState rejette (erreur interne)', async () => {
    vi.mocked(getPlaybackState).mockRejectedValueOnce(new Error('boom'));
    const res = await GET();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Internal server error');
  });
});

describe('POST /api/spotify/playback', () => {
  it('400 pour une action inconnue', async () => {
    const res = await POST(postReq({ action: 'fly' }, '2.2.2.1'));
    expect(res.status).toBe(400);
  });

  it('relaie une action de contrôle valide', async () => {
    vi.mocked(controlPlayback).mockResolvedValueOnce(new Response(null, { status: 204 }));
    const res = await POST(postReq({ action: 'pause' }, '2.2.2.2'));
    expect(res.status).toBe(200);
    expect(controlPlayback).toHaveBeenCalledWith('tok', 'pause');
  });

  it('400 pour transfer sans deviceId', async () => {
    const res = await POST(postReq({ action: 'transfer' }, '2.2.2.3'));
    expect(res.status).toBe(400);
  });

  it('relaie transfer avec deviceId', async () => {
    vi.mocked(transferPlayback).mockResolvedValueOnce(new Response(null, { status: 204 }));
    const res = await POST(postReq({ action: 'transfer', deviceId: 'd9' }, '2.2.2.4'));
    expect(res.status).toBe(200);
    expect(transferPlayback).toHaveBeenCalledWith('tok', 'd9');
  });

  it('400 pour un JSON invalide', async () => {
    const res = await POST(rawReq('not json', '3.3.3.1'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid JSON');
  });

  it('propage le statut d’erreur Spotify (body JSON)', async () => {
    vi.mocked(controlPlayback).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { reason: 'NO_ACTIVE_DEVICE' } }), { status: 404 }),
    );
    const res = await POST(postReq({ action: 'pause' }, '3.3.3.2'));
    expect(res.status).toBe(404);
    expect((await res.json()).details).toEqual({ error: { reason: 'NO_ACTIVE_DEVICE' } });
  });

  it('propage le statut d’erreur Spotify avec un body non-JSON', async () => {
    vi.mocked(controlPlayback).mockResolvedValueOnce(new Response('plain text', { status: 500 }));
    const res = await POST(postReq({ action: 'pause' }, '3.3.3.3'));
    expect(res.status).toBe(500);
    expect((await res.json()).details).toEqual({ error: 'plain text' });
  });

  it('500 quand controlPlayback rejette (erreur interne)', async () => {
    vi.mocked(controlPlayback).mockRejectedValueOnce(new Error('boom'));
    const res = await POST(postReq({ action: 'pause' }, '3.3.3.4'));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Internal server error');
  });

  it('401 sans session', async () => {
    mockedSession.mockResolvedValueOnce(null as never);
    const res = await POST(postReq({ action: 'pause' }, '5.5.5.1'));
    expect(res.status).toBe(401);
  });

  it('429 lorsque la limite de débit est dépassée', async () => {
    vi.mocked(controlPlayback).mockResolvedValue(new Response(null, { status: 204 }));
    let lastStatus = 0;
    for (let i = 0; i < 25; i += 1) {
      const res = await POST(postReq({ action: 'pause' }, '5.5.5.99'));
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  it('400 quand action n’est pas une chaîne', async () => {
    const res = await POST(postReq({ action: 123 }, '5.5.5.2'));
    expect(res.status).toBe(400);
  });

  it('400 quand deviceId a un mauvais type', async () => {
    const res = await POST(postReq({ action: 'transfer', deviceId: 123 }, '5.5.5.3'));
    expect(res.status).toBe(400);
  });

  it('400 quand le corps n’est pas un objet', async () => {
    const res = await POST(rawReq('42', '5.5.5.4'));
    expect(res.status).toBe(400);
  });

  it('400 quand le corps est null', async () => {
    const res = await POST(rawReq('null', '5.5.5.5'));
    expect(res.status).toBe(400);
  });
});
