import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientKey } from '@/lib/rate-limit';
import { controlPlayback, getPlaybackState, transferPlayback } from '@/lib/spotify-api';

const ACTIONS = ['play', 'pause', 'next', 'previous', 'transfer'] as const;
type Action = (typeof ACTIONS)[number];

type PlaybackBody = { action: Action; deviceId?: string };

function isPlaybackBody(value: unknown): value is PlaybackBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  if (typeof v.action !== 'string') {
    return false;
  }
  if (!ACTIONS.includes(v.action as Action)) {
    return false;
  }
  if (v.deviceId !== undefined && typeof v.deviceId !== 'string') {
    return false;
  }
  return true;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let accessToken: string;
  try {
    const token = await auth.api.getAccessToken({
      body: { providerId: 'spotify' },
      headers: await headers(),
    });
    accessToken = token.accessToken;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const state = await getPlaybackState(accessToken);
    if (!state) {
      return NextResponse.json({ error: 'Failed to get playback state' }, { status: 502 });
    }
    return NextResponse.json(state);
  } catch (error) {
    logger.error('Error getting playback state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let accessToken: string;
  try {
    const token = await auth.api.getAccessToken({
      body: { providerId: 'spotify' },
      headers: await headers(),
    });
    accessToken = token.accessToken;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = getClientKey(request.headers, session.user.id);
  const rl = checkRateLimit(`playback:${key}`);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isPlaybackBody(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  try {
    let res: Response;
    if (body.action === 'transfer') {
      if (!body.deviceId) {
        return NextResponse.json({ error: 'deviceId required for transfer' }, { status: 400 });
      }
      res = await transferPlayback(accessToken, body.deviceId);
    } else {
      res = await controlPlayback(accessToken, body.action);
    }

    if (!res.ok && res.status !== 204) {
      const errorText = await res.text();
      let errorData: Record<string, unknown>;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      logger.error('Spotify control error:', res.status, errorText);
      return NextResponse.json(
        { error: 'Spotify error', details: errorData, status: res.status },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error controlling playback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
