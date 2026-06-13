import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/spotify-api', () => ({
  getPlaybackState: vi.fn(),
  controlPlayback: vi.fn(),
  transferPlayback: vi.fn(),
}));

import { getServerSession } from 'next-auth/next';

import { GET, POST } from './route';

import { controlPlayback, getPlaybackState, transferPlayback } from '@/lib/spotify-api';
import { playbackStateFixture } from '@/test/fixtures';

const mockedSession = vi.mocked(getServerSession);

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
  mockedSession.mockResolvedValue({ accessToken: 'tok', user: { email: 'u@e.com' } } as never);
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
});
