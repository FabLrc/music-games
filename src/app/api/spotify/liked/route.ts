import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me/tracks?limit=50", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Spotify API error:", errorText)
      throw new Error("Failed to fetch liked tracks")
    }

    const data = await response.json()
    console.log(`Fetched ${data.items?.length || 0} liked tracks`)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching liked tracks:", error)
    return NextResponse.json({ error: "Failed to fetch liked tracks" }, { status: 500 })
  }
}
