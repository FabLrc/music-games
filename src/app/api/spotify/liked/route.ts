import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const count = searchParams.get("count")
    const limit = count ? Math.min(parseInt(count), 50) : 50

    // First, get the total count
    const initialResponse = await fetch("https://api.spotify.com/v1/me/tracks?limit=1", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })

    if (!initialResponse.ok) {
      const errorText = await initialResponse.text()
      console.error("Spotify API error:", errorText)
      throw new Error("Failed to fetch liked tracks count")
    }

    const initialData = await initialResponse.json()
    const total = initialData.total

    console.log(`Total liked tracks: ${total}`)

    if (total === 0) {
      return NextResponse.json({ items: [], total: 0 })
    }

    // Generate random offsets to fetch diverse tracks
    const tracksToFetch = Math.min(limit, total)
    const items: any[] = []

    if (total <= limit) {
      // If total is less than limit, fetch all
      const response = await fetch(`https://api.spotify.com/v1/me/tracks?limit=${total}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })
      const data = await response.json()
      items.push(...data.items)
    } else {
      // Fetch tracks with random offsets
      const offsets = new Set<number>()
      while (offsets.size < tracksToFetch) {
        offsets.add(Math.floor(Math.random() * total))
      }

      // Fetch each track individually (Spotify doesn't support multiple offsets in one request)
      const fetchPromises = Array.from(offsets).map(async (offset) => {
        const response = await fetch(
          `https://api.spotify.com/v1/me/tracks?limit=1&offset=${offset}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        )
        if (response.ok) {
          const data = await response.json()
          return data.items[0]
        }
        return null
      })

      const results = await Promise.all(fetchPromises)
      items.push(...results.filter(Boolean))
    }

    console.log(`Fetched ${items.length} random liked tracks from ${total} total`)
    return NextResponse.json({ items, total })
  } catch (error) {
    console.error("Error fetching liked tracks:", error)
    return NextResponse.json({ error: "Failed to fetch liked tracks" }, { status: 500 })
  }
}
