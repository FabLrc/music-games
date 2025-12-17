import { LyricLine } from "@/lib/lrc-parser"

// Types de questions disponibles
export type QuestionType = "lyrics" | "title" | "artist" | "album"

// Mode de jeu global
export type GameModeType = "lyrics-quiz" | "blind-test-title" | "blind-test-artist" | "survival" | "karaoke"
export type GameMode = GameModeType

// Configuration de base pour tous les types de questions
export interface BaseQuestion {
  type: QuestionType
  track: SpotifyApi.TrackObjectFull
  options: string[]
  correctAnswer: string
}

// Question de paroles avec contexte spécifique
export interface LyricsQuestion extends BaseQuestion {
  type: "lyrics"
  lyrics: LyricLine[]
  hiddenLyric: LyricLine
}

// Question de titre (Blind Test)
export interface TitleQuestion extends BaseQuestion {
  type: "title"
  startTime: number // Timestamp de départ de l'extrait (en secondes)
}

// Question d'artiste (Blind Test)
export interface ArtistQuestion extends BaseQuestion {
  type: "artist"
  startTime: number
}

// Question d'album
export interface AlbumQuestion extends BaseQuestion {
  type: "album"
  startTime: number
}

// Union type pour toutes les questions possibles
export type GameQuestion = LyricsQuestion | TitleQuestion | ArtistQuestion | AlbumQuestion

// Track de jeu avec sa question associée
export interface GameTrack {
  track: SpotifyApi.TrackObjectFull
  question: GameQuestion
}

// Résultat d'un round
export interface RoundResult {
  trackName: string
  artist: string
  albumName: string
  correct: boolean
  userAnswer: string
  correctAnswer: string
  questionType: QuestionType
  timeToAnswer?: number // En secondes
}

// Configuration du jeu
export interface GameConfiguration {
  gameMode: GameModeType
  source: "playlist" | "album" | "liked" | "random"
  sourceId?: string
  trackCount: number
  timeLimit?: number // Temps limite pour répondre (en secondes)
}

// Statistiques de la partie
export interface GameStats {
  correctAnswers: number
  totalQuestions: number
  averageTime?: number
  combo: number
  maxCombo: number
}
