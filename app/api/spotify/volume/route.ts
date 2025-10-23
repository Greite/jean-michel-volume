import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  console.log("Session:", session);
  console.log("Access Token:", session?.accessToken);

  if (!session?.accessToken) {
    console.error("No access token in session");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { volume } = await request.json();
    console.log("Setting volume to:", volume);

    // Le volume doit être entre 0 et 100
    const clampedVolume = Math.max(0, Math.min(100, Math.round(volume)));

    const response = await fetch(
      `https://api.spotify.com/v1/me/player/volume?volume_percent=${clampedVolume}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Spotify API error:", response.status, errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      return NextResponse.json(
        {
          error: "Failed to set volume",
          details: errorData,
          status: response.status
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, volume: clampedVolume });
  } catch (error) {
    console.error("Error setting volume:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me/player", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (response.status === 204) {
      return NextResponse.json({ error: "No active device" }, { status: 404 });
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to get playback state" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      volume: data.device?.volume_percent || 0,
      isPlaying: data.is_playing,
      device: data.device?.name,
    });
  } catch (error) {
    console.error("Error getting playback state:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
