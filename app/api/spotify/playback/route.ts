import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const state = await getPlaybackState(session.accessToken);
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
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userKey = session.user?.email ?? session.user?.name ?? 'anon';
  const key = getClientKey(request.headers, userKey);
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
      res = await transferPlayback(session.accessToken, body.deviceId);
    } else {
      res = await controlPlayback(session.accessToken, body.action);
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
