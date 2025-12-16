import { getLyrics } from "@/lib/lrclib"
import { parseLRC } from "@/lib/lrc-parser"
import {
  GameTrack,
  LyricsQuestion,
  TitleQuestion,
  ArtistQuestion,
  GameModeType,
} from "@/types/game"

/**
 * Génère une question de type "Lyrics" (Paroles)
 * Requiert que les paroles synchronisées soient disponibles
 */
export async function generateLyricsQuestion(
  track: SpotifyApi.TrackObjectFull
): Promise<GameTrack | null> {
  if (!track || !track.artists || track.artists.length === 0) {
    return null
  }

  const artistName = track.artists[0]?.name || ""
  const trackName = track.name
  const durationSeconds = Math.floor(track.duration_ms / 1000)

  // Fetch lyrics
  const lyricsData = await Promise.race([
    getLyrics(trackName, artistName, durationSeconds),
    new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    )
  ]).catch(() => null)

  if (!lyricsData?.syncedLyrics) {
    return null
  }

  const parsedLyrics = parseLRC(lyricsData.syncedLyrics)
  
  if (parsedLyrics.length < 5) {
    return null
  }

  // Pick random lyric to hide (not first or last)
  const randomIndex = Math.floor(Math.random() * (parsedLyrics.length - 2)) + 1
  const hiddenLyric = parsedLyrics[randomIndex]

  // Generate options from other lyrics in the same song
  const allLines = parsedLyrics.map(l => l.text).filter(t => t.trim() !== "")
  const uniqueLines = Array.from(new Set(allLines))
  const distractors = uniqueLines
    .filter(l => l !== hiddenLyric.text)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
  
  let options: string[]
  if (distractors.length >= 3) {
    options = [hiddenLyric.text, ...distractors].sort(() => Math.random() - 0.5)
  } else {
    options = [hiddenLyric.text, ...distractors]
    while (options.length < 4 && uniqueLines.length > 0) {
      const randomLine = uniqueLines[Math.floor(Math.random() * uniqueLines.length)]
      if (!options.includes(randomLine)) {
        options.push(randomLine)
      }
    }
    options = options.sort(() => Math.random() - 0.5)
  }

  const question: LyricsQuestion = {
    type: "lyrics",
    track,
    options,
    correctAnswer: hiddenLyric.text,
    lyrics: parsedLyrics,
    hiddenLyric,
  }

  return { track, question }
}

/**
 * Génère une question de type "Title" (Blind Test - Deviner le titre)
 * Utilise d'autres titres de la playlist comme distracteurs
 */
export function generateTitleQuestion(
  track: SpotifyApi.TrackObjectFull,
  allTracks: SpotifyApi.TrackObjectFull[]
): GameTrack {
  // Générer des distracteurs à partir d'autres chansons
  const otherTracks = allTracks.filter(t => t.id !== track.id)
  const distractors = otherTracks
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(t => t.name)

  // S'assurer qu'on a des distracteurs uniques
  const uniqueDistractors = Array.from(new Set(distractors))
  
  // Si pas assez de distracteurs uniques, générer des variations
  while (uniqueDistractors.length < 3) {
    const randomTrack = otherTracks[Math.floor(Math.random() * otherTracks.length)]
    if (randomTrack && !uniqueDistractors.includes(randomTrack.name) && randomTrack.name !== track.name) {
      uniqueDistractors.push(randomTrack.name)
    }
  }

  const options = [track.name, ...uniqueDistractors.slice(0, 3)].sort(() => Math.random() - 0.5)

  // Choisir un point de départ aléatoire (entre 10% et 50% de la chanson)
  const durationSeconds = track.duration_ms / 1000
  const startTime = Math.floor(durationSeconds * (0.1 + Math.random() * 0.4))

  const question: TitleQuestion = {
    type: "title",
    track,
    options,
    correctAnswer: track.name,
    startTime,
  }

  return { track, question }
}

/**
 * Génère une question de type "Artist" (Blind Test - Deviner l'artiste)
 * Utilise d'autres artistes de la playlist comme distracteurs
 */
export function generateArtistQuestion(
  track: SpotifyApi.TrackObjectFull,
  allTracks: SpotifyApi.TrackObjectFull[]
): GameTrack {
  const correctArtist = track.artists[0]?.name || "Unknown Artist"
  
  // Générer des distracteurs à partir d'autres artistes
  const otherArtists = allTracks
    .filter(t => t.id !== track.id)
    .map(t => t.artists[0]?.name)
    .filter(Boolean) as string[]
  
  const uniqueArtists = Array.from(new Set(otherArtists))
    .filter(artist => artist !== correctArtist)
  
  const distractors = uniqueArtists
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)

  // S'assurer qu'on a 3 distracteurs
  while (distractors.length < 3 && uniqueArtists.length > 0) {
    const randomArtist = uniqueArtists[Math.floor(Math.random() * uniqueArtists.length)]
    if (!distractors.includes(randomArtist)) {
      distractors.push(randomArtist)
    }
  }

  const options = [correctArtist, ...distractors.slice(0, 3)].sort(() => Math.random() - 0.5)

  // Choisir un point de départ aléatoire
  const durationSeconds = track.duration_ms / 1000
  const startTime = Math.floor(durationSeconds * (0.1 + Math.random() * 0.4))

  const question: ArtistQuestion = {
    type: "artist",
    track,
    options,
    correctAnswer: correctArtist,
    startTime,
  }

  return { track, question }
}

/**
 * Génère des questions selon le mode de jeu choisi
 */
export async function generateQuestions(
  tracks: SpotifyApi.TrackObjectFull[],
  gameMode: GameModeType,
  targetCount: number,
  onProgress?: (current: number, total: number) => void
): Promise<GameTrack[]> {
  const generatedTracks: GameTrack[] = []

  // Pour le mode Survival, on génère en continu
  const isSurvival = gameMode === "survival"
  const tracksToProcess = isSurvival ? tracks : tracks.slice(0, Math.min(tracks.length, targetCount * 3))

  for (let i = 0; i < tracksToProcess.length; i++) {
    const track = tracksToProcess[i]
    onProgress?.(i + 1, tracksToProcess.length)

    let gameTrack: GameTrack | null = null

    switch (gameMode) {
      case "lyrics-quiz":
      case "survival": // Le mode survival utilise aussi des questions de paroles par défaut
        gameTrack = await generateLyricsQuestion(track)
        break

      case "blind-test-title":
        gameTrack = generateTitleQuestion(track, tracks)
        break

      case "blind-test-artist":
        gameTrack = generateArtistQuestion(track, tracks)
        break
    }

    if (gameTrack) {
      generatedTracks.push(gameTrack)
      
      // En mode normal, s'arrêter quand on a assez de questions
      if (!isSurvival && generatedTracks.length >= targetCount) {
        break
      }
    }
  }

  return generatedTracks
}
