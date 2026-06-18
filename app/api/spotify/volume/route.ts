import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientKey } from '@/lib/rate-limit';
import { setSpotifyVolume } from '@/lib/spotify-api';

type VolumeBody = { volume: number };

function isVolumeBody(value: unknown): value is VolumeBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = (value as { volume?: unknown }).volume;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
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
  const rl = checkRateLimit(`vol:${key}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isVolumeBody(body)) {
    return NextResponse.json({ error: 'Invalid body: { volume: number 0..100 }' }, { status: 400 });
  }

  try {
    const response = await setSpotifyVolume(accessToken, body.volume);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Spotify API error:', response.status, errorText);

      let errorData: Record<string, unknown>;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      return NextResponse.json(
        {
          error: 'Failed to set volume',
          details: errorData,
          status: response.status,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      volume: Math.max(0, Math.min(100, Math.round(body.volume))),
    });
  } catch (error) {
    logger.error('Error setting volume:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
