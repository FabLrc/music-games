"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, useRef, useCallback } from "react"

export function useSpotifyPlayer() {
  const { data: session } = useSession()
  const [player, setPlayer] = useState<Spotify.Player | null>(null)
  const [deviceId, setDeviceId] = useState<string>("")
  const [isReady, setIsReady] = useState(false)
  const [isPaused, setIsPaused] = useState(true)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTrack, setCurrentTrack] = useState<Spotify.Track | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const playerRef = useRef<Spotify.Player | null>(null)

  useEffect(() => {
    if (!session?.accessToken) return

    const script = document.createElement("script")
    script.src = "https://sdk.scdn.co/spotify-player.js"
    script.async = true

    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      const newPlayer = new window.Spotify.Player({
        name: "Music Quiz Player",
        getOAuthToken: (cb: (token: string) => void) => {
          cb(session.accessToken!)
        },
        volume: 0.5,
      })

      newPlayer.addListener("ready", ({ device_id }: { device_id: string }) => {
        console.log("Ready with Device ID", device_id)
        setDeviceId(device_id)
        setIsReady(true)
      })

      newPlayer.addListener("not_ready", ({ device_id }: { device_id: string }) => {
        console.log("Device ID has gone offline", device_id)
        setIsReady(false)
      })

      newPlayer.addListener("player_state_changed", (state: Spotify.PlaybackState) => {
        if (!state) return

        setCurrentTrack(state.track_window.current_track)
        setIsPaused(state.paused)
        setPosition(state.position)
        setDuration(state.duration)
      })

      newPlayer.connect()
      playerRef.current = newPlayer
      setPlayer(newPlayer)
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect()
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [session?.accessToken])

  // Update position every 100ms when playing
  useEffect(() => {
    if (!isPaused && player && isReady) {
      intervalRef.current = setInterval(async () => {
        try {
          if (player && playerRef.current) {
            const state = await player.getCurrentState()
            if (state) {
              setPosition(state.position)
            }
          }
        } catch (error) {
          // Silently ignore errors during state polling
          console.debug('Error getting player state:', error)
        }
      }, 100)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPaused, player, isReady])

  const play = useCallback(
    async (uri?: string, retries = 3) => {
      if (!session?.accessToken) {
        throw new Error("Not authenticated")
      }

      // Wait for device to be ready (up to 10 seconds)
      if (!isReady || !deviceId) {
        console.log("Waiting for Spotify device to be ready...")
        const startTime = Date.now()
        while ((!isReady || !deviceId) && Date.now() - startTime < 10000) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        if (!isReady || !deviceId) {
          throw new Error("Spotify device not ready. Please refresh the page and try again.")
        }
      }

      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const response = await fetch(
            `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
            {
              method: "PUT",
              body: JSON.stringify({ uris: uri ? [uri] : undefined }),
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.accessToken}`,
              },
            }
          )

          if (response.ok) {
            return // Success
          }

          const errorText = await response.text()
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { error: { message: errorText } }
          }

          // If "Device not found", try to transfer playback to our device
          if (response.status === 404 && errorData.error?.reason === "NO_ACTIVE_DEVICE" && attempt < retries - 1) {
            console.warn("No active device found, attempting to transfer playback...")
            try {
              await fetch("https://api.spotify.com/v1/me/player", {
                method: "PUT",
                body: JSON.stringify({
                  device_ids: [deviceId],
                  play: false,
                }),
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.accessToken}`,
                },
              })
              // Wait a bit for the transfer to complete
              await new Promise(resolve => setTimeout(resolve, 1000))
              // Retry the play command
              continue
            } catch (transferError) {
              console.error("Failed to transfer playback:", transferError)
            }
          }

          // Retry on 502 Bad Gateway or 503 Service Unavailable
          if ((response.status === 502 || response.status === 503) && attempt < retries - 1) {
            console.warn(`Spotify API error (${response.status}), retrying... (attempt ${attempt + 1}/${retries})`)
            // Exponential backoff: wait 500ms, then 1s, then 2s
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)))
            continue
          }

          // For other errors or final retry, throw
          throw new Error(`Spotify API error: ${errorData.error?.message || response.statusText}`)
        } catch (error) {
          if (attempt === retries - 1) {
            throw error // Re-throw on final attempt
          }
          // On network errors, retry with backoff
          if (error instanceof TypeError) {
            console.warn(`Network error, retrying... (attempt ${attempt + 1}/${retries})`)
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)))
          } else {
            throw error // Re-throw non-network errors immediately
          }
        }
      }
    },
    [deviceId, session, isReady]
  )

  const pause = useCallback(async () => {
    try {
      if (!player || !playerRef.current || !isReady) {
        console.warn('Cannot pause: player not ready')
        return
      }
      await player.pause()
    } catch (error) {
      console.error('Error pausing player:', error)
    }
  }, [player, isReady])

  const resume = useCallback(async () => {
    try {
      if (!player || !playerRef.current || !isReady) {
        console.warn('Cannot resume: player not ready')
        return
      }
      await player.resume()
    } catch (error) {
      console.error('Error resuming player:', error)
    }
  }, [player, isReady])

  const seek = useCallback(
    async (positionMs: number) => {
      try {
        if (!player || !playerRef.current || !isReady) {
          console.warn('Cannot seek: player not ready')
          return
        }
        await player.seek(positionMs)
      } catch (error) {
        console.error('Error seeking:', error)
      }
    },
    [player, isReady]
  )

  return {
    player,
    deviceId,
    isReady,
    isPaused,
    position,
    duration,
    currentTrack,
    play,
    pause,
    resume,
    seek,
  }
}
