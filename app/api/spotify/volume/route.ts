import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userKey = session.user?.email ?? session.user?.name ?? 'anon';
  const key = getClientKey(request.headers, userKey);
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
    const response = await setSpotifyVolume(session.accessToken, body.volume);

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
